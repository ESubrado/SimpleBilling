from flask import request, jsonify
from flask.views import MethodView
from flask_smorest import Blueprint
import fitz  # PyMuPDF
import re
import json
import os
import datetime 
from schemas import PDFTextExtractionSchema
from .database_utils import BillingDatabase

# Create blueprint
blp = Blueprint(
    "extract-text",
    __name__,
    url_prefix="/",
    description="PDF Text Extraction API operations"
)

# Initialize database
db = BillingDatabase()

## Utility Functions from JSON
def load_provider_settings(provider="verizon"):
    """Load provider-specific settings from JSON file"""
    try:
        # Updated path - keywords.json is now in bill_server folder
        current_dir = os.path.dirname(os.path.abspath(__file__))
        bill_server_dir = os.path.dirname(current_dir)  # Go up one level to bill_server
        keywords_file = os.path.join(bill_server_dir, 'keywords.json')
        
        with open(keywords_file, 'r') as f:
            data = json.load(f)
            provider_data = data.get(provider, {})
            return provider_data.get('settings', {})
    except Exception as e:
        print(f"Error loading provider settings for {provider}: {str(e)}")
        return {}

def load_exclude_keywords(provider="verizon"):
    """Load exclude keywords from JSON file"""
    try:
        settings = load_provider_settings(provider)
        return settings.get('exclude_keywords', ['in', 'pay', 'auto', 'device'])
    except Exception as e:
        print(f"Error loading exclude keywords: {str(e)}")
        return ['in', 'pay', 'auto', 'device']

def load_required_keywords(provider="verizon"):
    """Load required keywords from JSON file"""
    try:
        settings = load_provider_settings(provider)
        return settings.get('required_keywords', [
            {"keyword": "Monthly Charges", "ukey": "monthly", "search_range": 50},
            {"keyword": "BUS UNL Pro 5G Smartphone", "ukey": "smartphone", "search_range": 50}
        ])
    except Exception as e:
        print(f"Error loading required keywords: {str(e)}")
        return [
            {"keyword": "Monthly Charges", "ukey": "monthly", "search_range": 50},
            {"keyword": "BUS UNL Pro 5G Smartphone", "ukey": "smartphone", "search_range": 50}
        ]

def load_inline_sentences(provider="verizon"):
    """Load inline sentences from JSON file"""
    try:
        settings = load_provider_settings(provider)
        return settings.get('inline_sentences', [
            {"keyword": "Total Amount Due", "ukey": "total_amount_due"},
            {"keyword": "Amount Due", "ukey": "amount_due"},
            {"keyword": "Balance Due", "ukey": "balance_due"}
        ])
    except Exception as e:
        print(f"Error loading inline sentences: {str(e)}")
        return [
            {"keyword": "Total Amount Due", "ukey": "total_amount_due"},
            {"keyword": "Amount Due", "ukey": "amount_due"},
            {"keyword": "Balance Due", "ukey": "balance_due"}
        ]

def load_account_level_keywords(provider="verizon"):
    """Load account level keywords from JSON file"""
    try:
        settings = load_provider_settings(provider)
        return settings.get('account_level_keywords', {
            "search_term": "Account Level Charges Details",
            "late_fee_sentence": "Late Fee"
        })
    except Exception as e:
        print(f"Error loading account level keywords: {str(e)}")
        return {
            "search_term": "Account Level Charges Details",
            "late_fee_sentence": "Late Fee"
        }

def load_previous_balance_keywords(provider="verizon"):
    """Load previous balance keywords from JSON file"""
    try:
        settings = load_provider_settings(provider)
        return settings.get('previous_balance_keywords', [
            {"keyword": "Previous Balance", "name": "Previous Balance", "ukey": "previous_balance", "header": "h1"},
            {"keyword": "Total Payments", "name": "Total Payments", "ukey": "total_payments", "header": "h2"}
        ])
    except Exception as e:
        print(f"Error loading previous balance keywords: {str(e)}")
        return [
            {"keyword": "Previous Balance", "name": "Previous Balance", "ukey": "previous_balance", "header": "h1"},
            {"keyword": "Total Payments", "name": "Total Payments", "ukey": "total_payments", "header": "h2"}
        ]

def parse_page_range(page_range_str, total_pages):
    """Parse page range string and return list of page numbers."""
    if not page_range_str or page_range_str.strip() == "":
        return list(range(1, total_pages + 1))
    
    pages = set()
    parts = page_range_str.replace(" ", "").split(",")
    
    for part in parts:
        if "-" in part:
            try:
                start, end = map(int, part.split("-"))
                start = max(1, start)
                end = min(total_pages, end)
                if start <= end:
                    pages.update(range(start, end + 1))
            except ValueError:
                continue
        else:
            try:
                page_num = int(part)
                if 1 <= page_num <= total_pages:
                    pages.add(page_num)
            except ValueError:
                continue
    
    return sorted(list(pages))

## PDF Data Extraction Functions
def extract_money_amounts_for_contacts(pdf_document, entries, required_keywords=None, provider="verizon"):
    """Scan the PDF document to find money amounts associated with extracted contacts."""
    results = []    

    if required_keywords is None:
        required_keywords = load_required_keywords(provider)
    
    # Standard money regex for main keywords
    money_regex = re.compile(r'\$[\d,]+\.?\d*', re.IGNORECASE)
    # Enhanced money regex for sub_keys to handle negative values
    negative_money_regex = re.compile(r'-?\$[\d,]+\.?\d*', re.IGNORECASE)
    # Installment pattern regex for "0 of 0" format
    installment_regex = re.compile(r'\d+\s+of\s+\d+', re.IGNORECASE)
    # Expiration pattern regex for "Expires on dd/mm/yy" format
    expiration_regex = re.compile(r'Expires\s+on\s+\d{1,2}\/\d{1,2}\/\d{2,4}', re.IGNORECASE)
    # Date range pattern regex for "mm/dd - mm/dd" format
    date_range_regex = re.compile(r'\d{1,2}\/\d{1,2}\s*-\s*\d{1,2}\/\d{1,2}', re.IGNORECASE)
    
    for entry in entries:
        contact_phone = entry['phone']
        contact_name = entry['text']
        contact_results = {
            'phone': contact_phone,
            'name': contact_name,
            'money_amounts': []
        }
        
        # Create search keywords including sub_keys with proper parent association
        search_keywords = []
        for kw in required_keywords:
            if isinstance(kw, dict):
                # Handle search_range for main keyword
                main_search_range = kw.get("search_range", {"start": 1, "end": 50})
                if isinstance(main_search_range, dict):
                    # Convert dict format to character count
                    main_range_chars = main_search_range.get("end", 50) - main_search_range.get("start", 1) + 1
                else:
                    # Handle legacy format or direct number
                    main_range_chars = main_search_range if main_search_range else 50
                
                # Add main keyword with search_range
                main_keyword = {
                    "search_term": kw.get("keyword", ""),
                    "original_keyword": kw.get("keyword", ""),
                    "display_name": kw.get("name", kw.get("keyword", "")),
                    "ukey": kw.get("ukey", ""),
                    "search_range": main_range_chars,
                    "is_sub_key": False,
                    "parent_ukey": None,
                    "parent_keyword": None
                }
                search_keywords.append(main_keyword)
                
                # Add sub_keys if they exist
                sub_keys = kw.get("sub_key", [])
                if sub_keys:
                    for sub_key in sub_keys:
                        if isinstance(sub_key, dict):
                            # Handle search_range for sub_key
                            sub_search_range = sub_key.get("search_range", main_search_range)
                            
                            if isinstance(sub_search_range, dict):
                                # Convert dict format to character count
                                sub_range_chars = sub_search_range.get("end", 50) - sub_search_range.get("start", 1) + 1
                            elif isinstance(sub_search_range, str) and sub_search_range.strip() == "":
                                # Handle empty string - use default
                                sub_range_chars = 50
                            elif sub_search_range:
                                # Handle direct number
                                sub_range_chars = sub_search_range
                            else:
                                # Use main keyword's range or default
                                sub_range_chars = main_range_chars
                            
                            search_keywords.append({
                                "search_term": sub_key.get("keyword", ""),
                                "original_keyword": sub_key.get("keyword", ""),
                                "display_name": sub_key.get("name", sub_key.get("keyword", "")),
                                "ukey": sub_key.get("ukey", ""),
                                "search_range": sub_range_chars,
                                "is_sub_key": True,
                                "parent_ukey": kw.get("ukey", ""),
                                "parent_keyword": kw.get("keyword", ""),
                                "keyword_pattern": sub_key.get("keyword_pattern", None),
                                "is_installment": sub_key.get("isInstallment", False),  # Add installment flag
                                "has_expiration": sub_key.get("hasExpiration", False),  # Add expiration flag
                                "allow_multiple": sub_key.get("allowMultiple", False),  # Add allowMultiple flag
                                "category": sub_key.get("category", "")  # Add category field
                            })
            else:
                search_keywords.append({
                    "search_term": kw,
                    "original_keyword": kw,
                    "display_name": kw,
                    "ukey": kw.lower().replace(" ", "_"),
                    "search_range": 50,  # Default range for string keywords
                    "is_sub_key": False,
                    "parent_ukey": None,
                    "parent_keyword": None,
                    "is_installment": False,
                    "allow_multiple": False
                })
                                    
        # Store found money amounts with parent-child relationship validation
        found_amounts = []
        
        # Scan entire document
        for page_num in range(len(pdf_document)):
            try:
                page = pdf_document.load_page(page_num)
                page_text = page.get_text()
                
                # Check if contact information appears on this page
                page_text_lower = page_text.lower()
                phone_in_page = contact_phone in page_text
                full_name_in_page = contact_name.lower() in page_text_lower
                
                if phone_in_page and full_name_in_page:
                    # First, find all parent keyword positions on the page
                    parent_positions = {}
                    for keyword_obj in search_keywords:
                        if not keyword_obj["is_sub_key"]:
                            parent_keyword = keyword_obj["search_term"]
                            parent_ukey = keyword_obj["ukey"]
                            parent_matches = list(re.finditer(re.escape(parent_keyword), page_text, re.IGNORECASE))
                            if parent_matches:
                                parent_positions[parent_ukey] = [(match.start(), match.end()) for match in parent_matches]
                    
                    # Track occurrence count for each sub_key to ensure unique ukeys
                    sub_key_counts = {}
                    
                    for keyword_obj in search_keywords:
                        search_term = keyword_obj["search_term"]
                        original_keyword = keyword_obj["original_keyword"]
                        display_name = keyword_obj["display_name"]
                        ukey = keyword_obj["ukey"]
                        search_range = keyword_obj["search_range"]
                        is_sub_key = keyword_obj["is_sub_key"]
                        parent_ukey = keyword_obj["parent_ukey"]
                        parent_keyword = keyword_obj["parent_keyword"]
                        keyword_pattern = keyword_obj.get("keyword_pattern", None)
                        is_installment = keyword_obj.get("is_installment", False)
                        has_expiration = keyword_obj.get("has_expiration", False)
                        allow_multiple = keyword_obj.get("allow_multiple", False)
                        category = keyword_obj.get("category", "")
                        
                        # Use keyword_pattern if provided, otherwise use exact match
                        if keyword_pattern:
                            # Remove quotes from the JSON pattern and use it directly  
                            if keyword_pattern.startswith("'") and keyword_pattern.endswith("'"):
                                keyword_pattern = keyword_pattern[1:-1]  
                            elif keyword_pattern.startswith('"') and keyword_pattern.endswith('"'):
                                keyword_pattern = keyword_pattern[1:-1]  
                            
                            keyword_matches = re.finditer(keyword_pattern, page_text, re.IGNORECASE)
                        else:
                            # Use exact match for other keywords
                            keyword_matches = re.finditer(re.escape(search_term), page_text, re.IGNORECASE)
                        
                        for keyword_match in keyword_matches:
                            keyword_start = keyword_match.start()
                            keyword_end = keyword_match.end()
                            
                            # For allowMultiple sub_keys, enforce strict exact match validation
                            if is_sub_key and allow_multiple:
                                matched_text = keyword_match.group().strip()
                                
                                # Check if the matched text is exactly the search term (case-insensitive)
                                if matched_text.lower() != search_term.lower():
                                    continue  # Skip this match as it contains extra words
                                
                                # Additional validation: check boundaries to ensure it's not part of a larger word/sentence
                                # Check character before the match
                                char_before = page_text[keyword_start - 1] if keyword_start > 0 else ' '
                                # Check character after the match
                                char_after = page_text[keyword_end] if keyword_end < len(page_text) else ' '
                                
                                # Ensure the keyword is surrounded by word boundaries (space, punctuation, or start/end of text)
                                if char_before.isalnum() or char_after.isalnum():
                                    continue  # Skip if it's part of a larger word
                                
                                # Special handling for accesscharge12m ukey - skip if followed by dash
                                if ukey == "accesscharge12m":
                                    # Look ahead for dash after whitespace
                                    lookahead_text = page_text[keyword_end:keyword_end + 10].lstrip(' \n\r\t')
                                    if lookahead_text.startswith('-'):
                                        continue  # Skip this match as it has a dash after the keyword
                                
                                # Additional check: look ahead to see if there are additional words immediately following
                                # Extract a small portion after the match to check for immediate word continuation
                                lookahead_text = page_text[keyword_end:keyword_end + 20].strip()
                                
                                # If the next characters (after whitespace) form a word, skip this match
                                if lookahead_text and not lookahead_text[0] in ' \n\r\t.,;:!?()[]{}"\'-$0123456789':
                                    # Check if the first non-whitespace character starts a word (letter)
                                    first_non_space = lookahead_text.lstrip(' \n\r\t')
                                    if first_non_space and first_non_space[0].isalpha():
                                        continue  # Skip - there's a word continuation
                            
                            # For sub_keys, verify they appear after their parent keyword
                            valid_sub_key = True
                            if is_sub_key and parent_ukey and parent_ukey in parent_positions:
                                # Check if this sub_key appears after any of its parent keywords
                                valid_sub_key = False
                                for parent_start, parent_end in parent_positions[parent_ukey]:
                                    # Sub_key should appear after parent keyword (within reasonable distance)
                                    if keyword_start > parent_start and (keyword_start - parent_end) < 2000:  # Within 2000 characters
                                        valid_sub_key = True
                                        break
                                
                                if not valid_sub_key:
                                    continue  # Skip this sub_key as it doesn't have a valid parent context
                            
                            # For non-allowMultiple sub_keys, check if we already found a money amount for this keyword
                            if not allow_multiple:
                                already_found = any(
                                    existing['keyword'] == original_keyword and
                                    existing['ukey'] == ukey and
                                    existing['page'] == page_num + 1
                                    for existing in found_amounts
                                )
                                
                                if already_found:
                                    continue  # Skip this occurrence - we only want the first one
                            
                            # Search for money amounts after keyword using specified search_range
                            search_start = keyword_end
                            search_end = min(len(page_text), keyword_end + int(search_range))
                            search_text = page_text[search_start:search_end]
                            
                            # Use different regex based on whether it's a sub_key
                            if is_sub_key:
                                money_match = negative_money_regex.search(search_text)
                            else:
                                money_match = money_regex.search(search_text)
                            
                            if money_match:
                                raw_amount = money_match.group().strip()
                                
                                # For sub_keys, ensure negative values follow -$000.00 pattern
                                if is_sub_key:
                                    if raw_amount.startswith('-'):
                                        # Already has negative sign, ensure dollar sign follows
                                        if not raw_amount.startswith('-$'):
                                            money_amount = '-$' + raw_amount[1:]
                                        else:
                                            money_amount = raw_amount
                                    else:
                                        # Positive amount for sub_key
                                        if not raw_amount.startswith('$'):
                                            money_amount = '$' + raw_amount
                                        else:
                                            money_amount = raw_amount
                                else:
                                    # Standard formatting for main keywords
                                    if not raw_amount.startswith('$'):
                                        money_amount = '$' + raw_amount
                                    else:
                                        money_amount = raw_amount
                                
                                actual_money_end = search_start + money_match.end()
                                
                                # Extract installment information if this is an installment sub_key
                                installment_info = ""
                                if is_installment:
                                    # Search for installment pattern in the same search area
                                    installment_match = installment_regex.search(search_text)
                                    if installment_match:
                                        installment_info = installment_match.group().strip()
                                
                                # Extract expiration information if this sub_key has expiration
                                expiration_info = ""
                                if has_expiration:
                                    # Search for expiration pattern in the same search area
                                    expiration_match = expiration_regex.search(search_text)
                                    if expiration_match:
                                        expiration_info = expiration_match.group().strip()

                                # Extract date range information that appears after the keyword
                                date_range_info = ""
                                # Search for date range pattern in a larger area after the keyword
                                extended_search_text = page_text[keyword_end:keyword_end + int(search_range) + 100]
                                date_range_match = date_range_regex.search(extended_search_text)
                                if date_range_match:
                                    date_range_info = date_range_match.group().strip()

                                # Handle unique ukey generation for allowMultiple sub_keys
                                final_ukey = ukey
                                if is_sub_key and allow_multiple:
                                    # Initialize counter for this sub_key if not exists
                                    if ukey not in sub_key_counts:
                                        sub_key_counts[ukey] = 0
                                    
                                    sub_key_counts[ukey] += 1
                                    final_ukey = f"{ukey}_{sub_key_counts[ukey]}"

                                # Get inline context - use the full matched text for better context
                                context_start = keyword_match.start()
                                inline_context = page_text[context_start:actual_money_end]
                                cleaned_context = re.sub(r'\s+', ' ', re.sub(r'\n+', ' ', inline_context)).strip()
                                
                                money_entry = {
                                    'amount': money_amount,
                                    'keyword': original_keyword,
                                    'name': display_name,
                                    'ukey': final_ukey,
                                    'search_term': search_term,
                                    'search_range_used': int(search_range),
                                    'inline_context': cleaned_context,
                                    'page': page_num + 1,
                                    'contact_match_type': ['phone', 'full_name'],
                                    'is_sub_key': is_sub_key,
                                    'parent_ukey': parent_ukey,
                                    'parent_keyword': parent_keyword,
                                    'keyword_position': keyword_start,
                                    'matched_text': keyword_match.group(),  # Add the actual matched text
                                    'used_pattern': keyword_pattern if keyword_pattern else 'exact_match',  # Track which pattern was used
                                    'installment': installment_info,  # Add installment field
                                    'expiration': expiration_info,  # Add expiration field
                                    'date_range': date_range_info,  # Add date range field
                                    'allow_multiple': allow_multiple,  # Track if this was an allowMultiple sub_key
                                    'category': category  # Add category field
                                }
                                
                                # Add the occurrence found
                                found_amounts.append(money_entry)
                                
                                # For non-allowMultiple, break after finding the first money amount
                                if not allow_multiple:
                                    break
                        
            except Exception as e:
                print(f"Error processing page {page_num + 1} for contact {contact_name}: {str(e)}")
                continue
        
        # Organize results with enhanced parent-child validation
        if found_amounts:
            organized_amounts = []
            parent_entries = {}
            orphaned_sub_keys = []
            
            # First pass: collect parent entries
            for amount in found_amounts:
                if not amount['is_sub_key']:
                    parent_entry = {
                        'amount': amount['amount'],
                        'keyword': amount['keyword'],
                        'name': amount['name'],
                        'ukey': amount['ukey'],
                        'inline_context': amount['inline_context'],
                        'contact_match_type': amount['contact_match_type'],
                        'sub_keys': []
                    }
                    parent_entries[amount['ukey']] = parent_entry
                    organized_amounts.append(parent_entry)
            
            # Second pass: process sub_keys and ensure they have valid parents
            for amount in found_amounts:
                if amount['is_sub_key']:
                    parent_ukey = amount['parent_ukey']
                    
                    # Only add sub_key if parent exists
                    if parent_ukey and parent_ukey in parent_entries:
                        sub_key_entry = {
                            'amount': amount['amount'],
                            'keyword': amount['keyword'],
                            'name': amount['name'],
                            'ukey': amount['ukey'],
                            'inline_context': amount['inline_context'],
                            'contact_match_type': amount['contact_match_type'],
                            'parent_keyword': amount['parent_keyword'],
                            'installment': amount.get('installment', ''),  # Add installment field to sub_key entry
                            'expiration': amount.get('expiration', ''),  # Add expiration field to sub_key entry
                            'date_range': amount.get('date_range', ''),  # Add date_range field to sub_key entry
                            'allow_multiple': amount.get('allow_multiple', False),  # Add allow_multiple field to sub_key entry
                            'category': amount.get('category', '')  # Add category field to sub_key entry
                        }
                        parent_entries[parent_ukey]['sub_keys'].append(sub_key_entry)
                    else:
                        # Log orphaned sub_keys for debugging
                        orphaned_sub_keys.append({
                            'sub_key': amount['keyword'],
                            'parent_ukey': parent_ukey,
                            'reason': f"Parent '{parent_ukey}' not found for sub_key '{amount['keyword']}'"
                        })
            
            # Third pass: Sort sub_keys by date_range within each parent
            def parse_date_for_sorting(date_range_str):
                """Parse date range string and return the start date for sorting"""
                if not date_range_str or date_range_str.strip() == '':
                    return None
                
                # Extract the first date from formats like "mm/dd - mm/dd" or "mm/dd"
                date_match = re.search(r'(\d{1,2}\/\d{1,2})', date_range_str)
                if date_match:
                    try:
                        date_str = date_match.group(1)
                        # Assume current year if not specified
                        current_year = datetime.datetime.now().year
                        date_obj = datetime.datetime.strptime(f"{date_str}/{current_year}", "%m/%d/%Y")
                        return date_obj
                    except ValueError:
                        return None
                return None
            
            def sort_sub_keys_by_date_and_category(sub_keys):
                """Sort sub_keys by category first, then by date_range within each category"""
                # Group by category
                categorized = {}
                for sub_key in sub_keys:
                    category = sub_key.get('category', '').strip()
                    if not category:
                        category = 'uncategorized'
                    
                    if category not in categorized:
                        categorized[category] = []
                    categorized[category].append(sub_key)
                
                # Sort within each category by date
                sorted_sub_keys = []
                
                # Sort categories alphabetically, but put 'uncategorized' last
                sorted_categories = sorted([cat for cat in categorized.keys() if cat != 'uncategorized'])
                if 'uncategorized' in categorized:
                    sorted_categories.append('uncategorized')
                
                for category in sorted_categories:
                    category_sub_keys = categorized[category]
                    
                    # Sort by date within category
                    category_sub_keys.sort(key=lambda x: (
                        parse_date_for_sorting(x.get('date_range', '')) or datetime.datetime.min,
                        x.get('ukey', '')  # Secondary sort by ukey for consistency
                    ))
                    
                    sorted_sub_keys.extend(category_sub_keys)
                
                return sorted_sub_keys
            
            # Apply sorting to each parent's sub_keys
            for parent_entry in organized_amounts:
                if parent_entry['sub_keys']:
                    parent_entry['sub_keys'] = sort_sub_keys_by_date_and_category(parent_entry['sub_keys'])
            
            # Log orphaned sub_keys for debugging
            if orphaned_sub_keys:
                print(f"Orphaned sub_keys for contact {contact_name}:")
                for orphan in orphaned_sub_keys:
                    print(f"  - {orphan['reason']}")
            
            contact_results['money_amounts'] = organized_amounts
            results.append(contact_results)
    
    return results

def extract_money_from_bill_summary(bill_summary_data, provider="verizon"):
    """Extract money amounts after specific sentences and billing details in the bill summary page."""
    if not bill_summary_data or not bill_summary_data.get('page_text'):
        return []
    
    page_text = bill_summary_data['page_text']
    inline_sentences = load_inline_sentences(provider)
    results = []
    
    # Additional billing detail sentences
    billing_detail_sentences = [
        {"keyword": "Account", "name": "Account Number", "ukey": "account"},
        {"keyword": "Invoice", "name": "Invoice Number", "ukey": "invoice"},
        {"keyword": "Billing period", "name": "Billing Period", "ukey": "billing_period"},
        {"keyword": "Due date", "name": "Due Date", "ukey": "due_date"}
    ]
    
    all_sentences = inline_sentences + billing_detail_sentences
    money_regex = re.compile(r'\$[\d,]+\.?\d*', re.IGNORECASE)
    
    for sentence_obj in all_sentences:
        if isinstance(sentence_obj, dict):
            sentence = sentence_obj.get('keyword', '')
            display_name = sentence_obj.get('name', sentence)
            ukey = sentence_obj.get('ukey', '')
            is_child = sentence_obj.get('isChild', False)  # Extract isChild field
        else:
            sentence = sentence_obj
            display_name = sentence
            ukey = sentence.lower().replace(' ', '_')
            is_child = False
        
        if not sentence:
            continue
            
        sentence_matches = re.finditer(re.escape(sentence), page_text, re.IGNORECASE)
        
        for sentence_match in sentence_matches:
            sentence_start = sentence_match.start()
            sentence_end = sentence_match.end()
            
            search_start = sentence_end
            search_end = min(len(page_text), sentence_end + 200)
            search_text = page_text[search_start:search_end]
            
            is_billing_detail = ukey in ['account', 'invoice', 'billing_period', 'due_date']
            extracted_value = None
            
            if is_billing_detail:
                clean_text = re.sub(r'^[\s:#\-–—]+', '', search_text)
                lines = clean_text.split('\n')
                
                for line in lines:
                    line = line.strip()
                    if line and len(line) > 1:
                        if ukey == 'account':
                            account_match = re.search(r'(\d+(?:[-\s]\d+)*)', line)
                            extracted_value = account_match.group(1).strip() if account_match else line[:30].strip()
                        elif ukey == 'invoice':
                            invoice_match = re.search(r'([A-Z0-9\-]+)', line, re.IGNORECASE)
                            extracted_value = invoice_match.group(1).strip() if invoice_match else line[:30].strip()
                        elif ukey == 'billing_period':
                            date_pattern = r'([A-Za-z]{3}\s+\d{1,2},?\s+\d{4}\s*[-–—]\s*[A-Za-z]{3}\s+\d{1,2},?\s+\d{4})'
                            date_match = re.search(date_pattern, line)
                            if date_match:
                                extracted_value = date_match.group(1).strip()
                            else:
                                date_pattern2 = r'(\d{1,2}\/\d{1,2}\/\d{4}\s*[-–—]\s*\d{1,2}\/\d{1,2}\/\d{4})'
                                date_match2 = re.search(date_pattern2, line)
                                extracted_value = date_match2.group(1).strip() if date_match2 else line[:50].strip()
                        elif ukey == 'due_date':
                            date_pattern = r'([A-Za-z]{3}\s+\d{1,2},?\s+\d{4})'
                            date_match = re.search(date_pattern, line)
                            if date_match:
                                extracted_value = date_match.group(1).strip()
                            else:
                                date_pattern2 = r'(\d{1,2}\/\d{1,2}\/\d{4})'
                                date_match2 = re.search(date_pattern2, line)
                                extracted_value = date_match2.group(1).strip() if date_match2 else line[:30].strip()
                        break
                
                if not extracted_value:
                    first_word_match = re.search(r'([^\s\n\r]+(?:\s+[^\s\n\r]+)*)', clean_text)
                    if first_word_match:
                        extracted_value = first_word_match.group(1)[:50].strip()
            else:
                # Special handling for balance_forward to consider negative values
                if ukey == 'balance_forward' or ukey == 'total_charges':
                    # Enhanced regex for negative values specifically for balance_forward
                    negative_money_regex = re.compile(r'[-\(\$]*\$?[\d,]+\.?\d*\)?|\(\$?[\d,]+\.?\d*\)', re.IGNORECASE)
                    money_match = negative_money_regex.search(search_text)
                    if money_match:
                        raw_amount = money_match.group().strip()
                        
                        # Normalize the amount format for balance_forward
                        if raw_amount.startswith('(') and raw_amount.endswith(')'):
                            # Convert (amount) to -$amount format
                            inner_amount = raw_amount[1:-1]
                            if not inner_amount.startswith('$'):
                                inner_amount = '$' + inner_amount
                            extracted_value = '-' + inner_amount
                        elif raw_amount.startswith('-'):
                            # Already has negative sign
                            if not raw_amount.startswith('-$'):
                                extracted_value = '-$' + raw_amount[1:]
                            else:
                                extracted_value = raw_amount
                        else:
                            # Positive amount
                            if not raw_amount.startswith('$'):
                                extracted_value = '$' + raw_amount
                            else:
                                extracted_value = raw_amount
                else:
                    # Standard money extraction for all other ukeys
                    money_match = money_regex.search(search_text)
                    if money_match:
                        extracted_value = money_match.group().strip()
            
            if extracted_value:
                if is_billing_detail:
                    inline_context = f"{sentence}: {extracted_value}"
                else:
                    money_match = money_regex.search(search_text)
                    if money_match:
                        actual_money_end = search_start + money_match.end()
                        inline_context = page_text[sentence_start:actual_money_end]
                        inline_context = re.sub(r'\s+', ' ', re.sub(r'\n+', ' ', inline_context)).strip()
                    else:
                        inline_context = f"{sentence}: {extracted_value}"
                
                money_entry = {
                    'sentence': sentence,
                    'name': display_name,
                    'ukey': ukey,
                    'amount': extracted_value,
                    'is_child': is_child,  # Include isChild field in return value
                    'inline_context': inline_context,
                    'page': bill_summary_data['page_number'],
                    'type': 'billing_detail' if is_billing_detail else 'money_amount'
                }
                
                exists = any(
                    existing['amount'] == extracted_value and
                    existing['sentence'] == sentence
                    for existing in results
                )
                
                if not exists:
                    results.append(money_entry)
    
    return results

def find_bill_summary_page(pdf_document, pages_to_extract, provider="verizon"):
    """Find the page number that contains "Bill summary" text within the specified page range."""
    search_term = "Bill summary"
    
    for page_num in pages_to_extract:
        try:
            page = pdf_document.load_page(page_num - 1)
            page_text = page.get_text()
            
            if search_term.lower() in page_text.lower():
                bill_summary_data = {
                    "page_number": page_num,
                    "page_text": page_text,
                    "text_length": len(page_text)
                }
                
                money_amounts = extract_money_from_bill_summary(bill_summary_data, provider)
                bill_summary_data["money_amounts"] = money_amounts
                
                return bill_summary_data
                
        except Exception as e:
            print(f"Error searching for 'Bill summary' on page {page_num}: {str(e)}")
            continue
    
    return None

def find_account_level_charges_page(pdf_document, pages_to_extract, provider="verizon"):
    """Find the page number that contains "Account Level Charges Details" text within the specified page range and extract Late Fee amounts."""
    account_keywords = load_account_level_keywords(provider)
    search_term = account_keywords.get("search_term", "Account Level Charges Details")
    late_fee_sentence = account_keywords.get("late_fee_sentence", "Late Fee")
    
    for page_num in pages_to_extract:
        try:
            page = pdf_document.load_page(page_num - 1)
            page_text = page.get_text()
            
            if search_term.lower() in page_text.lower():
                account_charges_data = {
                    "late_fees": []
                }
                
                # Extract Late Fee amounts
                money_regex = re.compile(r'\$[\d,]+\.?\d*', re.IGNORECASE)
                
                late_fee_matches = re.finditer(re.escape(late_fee_sentence), page_text, re.IGNORECASE)
                
                for late_fee_match in late_fee_matches:
                    late_fee_end = late_fee_match.end()
                    
                    # Search for money amounts after "Late Fee"
                    search_start = late_fee_end
                    search_end = min(len(page_text), late_fee_end + 100)
                    search_text = page_text[search_start:search_end]
                    
                    money_match = money_regex.search(search_text)
                    
                    if money_match:
                        money_amount = money_match.group().strip()
                        actual_money_end = search_start + money_match.end()
                        
                        # Get inline context
                        context_start = late_fee_match.start()
                        inline_context = page_text[context_start:actual_money_end]
                        cleaned_context = re.sub(r'\s+', ' ', re.sub(r'\n+', ' ', inline_context)).strip()
                        
                        late_fee_entry = {
                            'amount': money_amount,
                            'sentence': late_fee_sentence,
                            'ukey': 'late_fee',
                            'inline_context': cleaned_context,
                            'page': page_num
                        }
                        
                        # Check for duplicates
                        exists = any(
                            existing['amount'] == money_amount and 
                            existing['sentence'] == late_fee_sentence
                            for existing in account_charges_data['late_fees']
                        )
                        
                        if not exists:
                            account_charges_data['late_fees'].append(late_fee_entry)
                
                # Return empty string if no Late Fee data is found
                if not account_charges_data['late_fees']:
                    return ""
                
                return account_charges_data
                
        except Exception as e:
            print(f"Error searching for 'Account Level Charges Details' on page {page_num}: {str(e)}")
            continue
    
    return ""

def find_previous_balance_page(pdf_document, pages_to_extract, provider="verizon"):
    """Find the page number that contains "Previous Balance" text within the specified page range and extract relevant details using keywords from JSON."""
    search_term = "Previous Balance"
    
    for page_num in pages_to_extract:
        try:
            page = pdf_document.load_page(page_num - 1)
            page_text = page.get_text()
            
            if search_term.lower() in page_text.lower():
                previous_balance_data = {
                    "page_number": page_num,
                    "page_text": page_text,
                    "text_length": len(page_text),
                    "previous_balance_amounts": []
                }
                
                # Load previous balance keywords from JSON
                previous_balance_keywords = load_previous_balance_keywords(provider)
                
                # Money regex that specifically looks for dollar symbol with amount
                # Handles: $123.45, -$123.45, $1,234.56, -$1,234.56
                money_regex = re.compile(r'-?\$[\d,]+\.?\d*', re.IGNORECASE)
                
                # Enhanced date regex for various formats
                date_regex = re.compile(r'\b(?:\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|[A-Za-z]{3}\s+\d{1,2},?\s+\d{4})\b', re.IGNORECASE)
                
                # Phone number regex for 000-000-0000 pattern
                phone_regex = re.compile(r'\d{3}-\d{3}-\d{4}', re.IGNORECASE)
                
                for keyword_obj in previous_balance_keywords:
                    if isinstance(keyword_obj, dict):
                        keyword = keyword_obj.get('keyword', '')
                        display_name = keyword_obj.get('name', keyword)
                        ukey = keyword_obj.get('ukey', '')
                        header_type = keyword_obj.get('header', 'paragraph')
                        is_child = keyword_obj.get('isChild', False)
                        include_contact = keyword_obj.get('includeContact', False)
                    else:
                        keyword = keyword_obj
                        display_name = keyword
                        ukey = keyword.lower().replace(' ', '_')
                        header_type = 'paragraph'
                        is_child = False
                        include_contact = False
                    
                    # Don't skip any keywords - process all Previous Balance related entries
                    if not keyword:
                        continue
                    
                    # Search for the keyword and extract amount after it
                    keyword_matches = re.finditer(re.escape(keyword), page_text, re.IGNORECASE)
                    
                    for keyword_match in keyword_matches:
                        keyword_end = keyword_match.end()
                        
                        # Search for money amounts after the keyword
                        search_start = keyword_end
                        search_end = min(len(page_text), keyword_end + 300)
                        search_text = page_text[search_start:search_end]
                        
                        # Find money value with dollar symbol
                        money_match = money_regex.search(search_text)
                        
                        if money_match:
                            money_amount = money_match.group().strip()
                            money_end = search_start + money_match.end()
                            
                            # Find ALL dates in the search area after the keyword
                            extended_search_end = min(len(page_text), keyword_end + 500)
                            extended_search_text = page_text[keyword_end:extended_search_end]
                            
                            all_date_matches = list(date_regex.finditer(extended_search_text))
                            closest_date = ""
                            closest_date_distance = float('inf')
                            
                            # Find the closest date to the keyword
                            for date_match in all_date_matches:
                                date_start_in_extended = date_match.start()
                                date_distance = date_start_in_extended
                                
                                if date_distance < closest_date_distance:
                                    closest_date_distance = date_distance
                                    closest_date = date_match.group().strip()
                            

                            # Find contact number in the search area
                            all_phone_matches = list(phone_regex.finditer(extended_search_text))
                            closest_contact = ""
                            closest_contact_distance = float('inf')
                            
                            # Find the closest contact number to the keyword
                            for phone_match in all_phone_matches:
                                phone_start_in_extended = phone_match.start()
                                phone_distance = phone_start_in_extended
                                
                                if phone_distance < closest_contact_distance:
                                    closest_contact_distance = phone_distance
                                    closest_contact = phone_match.group().strip()
                            

                            # Get inline context (include closest date and contact if found)
                            context_start = keyword_match.start()
                            context_end = money_end
                            

                            if closest_date:
                                # Find the actual position of the closest date in the full text for context
                                closest_date_search = re.search(re.escape(closest_date), page_text[keyword_end:extended_search_end])
                                if closest_date_search:
                                    actual_date_end = keyword_end + closest_date_search.end()
                                    context_end = max(context_end, actual_date_end)
                            

                            if closest_contact:
                                # Find the actual position of the closest contact in the full text for context
                                closest_contact_search = re.search(re.escape(closest_contact), page_text[keyword_end:extended_search_end])
                                if closest_contact_search:
                                    actual_contact_end = keyword_end + closest_contact_search.end()
                                    context_end = max(context_end, actual_contact_end)
                            

                            inline_context = page_text[context_start:context_end]
                            cleaned_context = re.sub(r'\s+', ' ', re.sub(r'\n+', ' ', inline_context)).strip()
                            
                            balance_entry = {
                                'amount': money_amount,
                                'date': closest_date,
                                'contact': closest_contact,
                                'sentence': keyword,
                                'name': display_name,
                                'ukey': ukey,
                                'header_type': header_type,
                                'is_child': is_child,
                                'includeContact': include_contact,
                                'inline_context': cleaned_context,
                                'page': page_num
                            }
                            
                            # Add all entries including Previous Balance entries
                            previous_balance_data['previous_balance_amounts'].append(balance_entry)
                        else:
                            # Handle case where "Previous Balance" might have no money amount or special text
                            if ukey == 'previous_balance':
                                # Look for alternative patterns like "No Payment Received" or "$0.00"
                                extended_search_text = page_text[keyword_end:keyword_end + 200]
                                
                                # Check for "No Payment Received" or similar text
                                no_payment_match = re.search(r'(no\s+payment\s+received|not\s+available|\$0\.00)', extended_search_text, re.IGNORECASE)
                                if no_payment_match:
                                    balance_entry = {
                                        'amount': '$0.00',
                                        'date': '',
                                        'contact': '',
                                        'sentence': keyword,
                                        'name': display_name,
                                        'ukey': ukey,
                                        'header_type': header_type,
                                        'is_child': is_child,
                                        'includeContact': include_contact,
                                        'inline_context': f"{keyword}: {no_payment_match.group().strip()}",
                                        'page': page_num
                                    }
                                    previous_balance_data['previous_balance_amounts'].append(balance_entry)
                
                # Return the data even if no amounts found (don't return empty string)
                return previous_balance_data
                
        except Exception as e:
            print(f"Error searching for 'Previous Balance' on page {page_num}: {str(e)}")
            continue
    
    return ""

@blp.route("/extract-text")
class PDFTextExtractionView(MethodView):
    
    @blp.response(200, PDFTextExtractionSchema)
    def post(self):
        """Extract text from uploaded PDF file using PyMuPDF with optional page range and find text after phone numbers"""
        try:
            if 'file' not in request.files:
                return jsonify({
                    "success": False,
                    "message": "No file provided",
                    "text": "",
                    "entries": [],
                    "pdf_filename": "",
                    "total_pages": 0
                }), 400
            
            file = request.files['file']
            page_range_str = request.form.get('pageRange', '')
            keywords_str = request.form.get('keywords', '')
            provider = request.form.get('provider', 'verizon')  # Default to verizon
            save_to_db = request.form.get('saveToDatabase', 'false').lower() == 'true'  # New parameter
            
            if file.filename == '':
                return jsonify({
                    "success": False,
                    "message": "No file selected",
                    "text": "",
                    "entries": [],
                    "pdf_filename": "",
                    "total_pages": 0
                }), 400
            
            if not file.filename.lower().endswith('.pdf'):
                return jsonify({
                    "success": False,
                    "message": "File must be a PDF",
                    "text": "",
                    "entries": [],
                    "pdf_filename": file.filename or "",
                    "total_pages": 0
                }), 400
            
            # Parse keywords if provided
            required_keywords = None
            if keywords_str and keywords_str.strip():
                keyword_list = [keyword.strip() for keyword in keywords_str.split(',') if keyword.strip()]
                required_keywords = []
                for kw in keyword_list:
                    required_keywords.append({
                        "keyword": kw,
                        "ukey": kw.lower().replace(" ", "_")
                    })
            
            file_content = file.read()
            pdf_document = fitz.open(stream=file_content, filetype="pdf")
            total_pages = len(pdf_document)
            
            # Validate document contains Verizon keywords
            verizon_keywords = ["verizon.com/business", "verizon"]
            document_valid = False
            
            # Check first 3 pages for Verizon keywords (bills usually have branding on first few pages)
            pages_to_check = min(3, total_pages)
            
            for page_num in range(pages_to_check):
                try:
                    page = pdf_document.load_page(page_num)
                    page_text = page.get_text().lower();
                    
                    # Check for any of the Verizon keywords
                    if any(keyword.lower() in page_text for keyword in verizon_keywords):
                        document_valid = True
                        print(f"Found Verizon keyword on page {page_num + 1}")
                        break
                        
                except Exception as e:
                    print(f"Error validating page {page_num + 1}: {str(e)}")
                    continue
            
            print(f"Document validation result: {document_valid}")
            
            if not document_valid:
                pdf_document.close()
                return jsonify({
                    "success": False,
                    "message": "Invalid document: This application supports Verizon bills for now. Other carriers will be added soon.",
                    "text": "",
                    "isInvalidDocument": True,
                    "entries": [],
                    "pdf_filename": file.filename or "",
                    "total_pages": total_pages
                }), 400
            
            pages_to_extract = parse_page_range(page_range_str, total_pages)
            
            if not pages_to_extract:
                pdf_document.close()
                return jsonify({
                    "success": False,
                    "message": "No valid pages found in the specified range",
                    "text": "",
                    "entries": [],
                    "pdf_filename": file.filename or "",
                    "total_pages": total_pages
                }), 400
            
            bill_summary_data = find_bill_summary_page(pdf_document, pages_to_extract, provider)
            account_charges_data = find_account_level_charges_page(pdf_document, pages_to_extract, provider)
            previous_balance_data = find_previous_balance_page(pdf_document, pages_to_extract, provider)
            
            # Extract phone numbers and names
            entries = []
            phone_pattern = r'\d{3}-\d{3}-\d{4}'
            name_pattern = r'[A-Z][a-z]+\s+[A-Z][a-z]+'
            exclude_keywords = load_exclude_keywords(provider)
            
            for page_num in pages_to_extract:
                try:
                    page = pdf_document.load_page(page_num - 1)
                    page_text = page.get_text()
                    
                    matches = re.finditer(phone_pattern, page_text)
                    for match in matches:
                        phone_number = match.group()
                        cleaned_phone = re.sub(r'\D', '', phone_number)
                        if len(cleaned_phone) == 10:
                            start_pos = match.end()
                            remaining_text = page_text[start_pos:]
                            text_to_search = remaining_text[:100]
                            
                            has_exclude_keyword = any(keyword.lower() in text_to_search.lower() for keyword in exclude_keywords)
                            
                            if not has_exclude_keyword:
                                name_match = re.search(name_pattern, text_to_search)
                                
                                if name_match:
                                    full_name = name_match.group()
                                    full_name = re.sub(r'\s+', ' ', re.sub(r'\n+', ' ', full_name)).strip()
                                    entries.append({
                                        "phone": phone_number,
                                        "text": full_name
                                    })
                    
                except Exception as e:
                    print(f"Error extracting page {page_num}: {str(e)}")
                    continue
            
            money_results = extract_money_amounts_for_contacts(pdf_document, entries, required_keywords, provider)
            pdf_document.close()
            
            # Merge entries with money analysis
            money_lookup = {result['phone']: result for result in money_results}
            
            merged_entries = []
            for entry in entries:
                phone = entry['phone']
                name = entry['text']
                merged_entry = {
                    "phone": phone,
                    "name": name,
                    "money_amounts": []
                }
                
                if phone in money_lookup:
                    merged_entry["money_amounts"] = money_lookup[phone]["money_amounts"]
                
                merged_entries.append(merged_entry)
            
            stringified_entries = json.dumps(merged_entries, indent=2)
            
            # Keywords used
            base_keywords = required_keywords if required_keywords else load_required_keywords(provider)
            all_keywords_used = []
            
            for kw in base_keywords:
                if isinstance(kw, dict):
                    all_keywords_used.append(f"{kw.get('keyword', '')} (ukey: {kw.get('ukey', '')})")
                else:
                    all_keywords_used.append(kw)
            
            for entry in entries:
                name = entry['text']
                phone = entry['phone']
                all_keywords_used.extend([
                    f"{name} (contact_name)",
                    f"{phone} (contact_phone)",
                    f"{name} {phone} (combined)"
                ])
            
            contacts_with_money = len([entry for entry in merged_entries if entry['money_amounts']])
            
            # Build summary object
            summary = {
                "invoice": None,
                "account": None,
                "billing_period": None,
                "due_date": None,
                "total_charges": None,
                "money_amounts": [],
                "late_fees": [],
                "previous_balance": []
            }
            
            if bill_summary_data and bill_summary_data.get("money_amounts"):
                money_amounts_array = bill_summary_data["money_amounts"]
                filtered_money_amounts = []
                billing_detail_ukeys = ['invoice', 'account', 'billing_period', 'due_date', 'total_charges']
                
                for item in money_amounts_array:
                    ukey = item.get('ukey', '')
                    amount = item.get('amount', '')
                    
                    if ukey == 'invoice':
                        summary["invoice"] = amount
                    elif ukey == 'account':
                        summary["account"] = amount
                    elif ukey == 'billing_period':
                        summary["billing_period"] = amount
                    elif ukey == 'due_date':
                        summary["due_date"] = amount
                    elif ukey == 'total_charges':
                        summary["total_charges"] = amount
                    else:
                        if ukey not in billing_detail_ukeys:
                            filtered_money_amounts.append(item)
                
                summary["money_amounts"] = filtered_money_amounts
            
            # Add late_fees to summary
            if account_charges_data and isinstance(account_charges_data, dict) and account_charges_data.get("late_fees"):
                summary["late_fees"] = account_charges_data["late_fees"]
            
            # Add previous_balance to summary
            if previous_balance_data and isinstance(previous_balance_data, dict) and previous_balance_data.get("previous_balance_amounts"):
                summary["previous_balance"] = previous_balance_data["previous_balance_amounts"]
            
            # Prepare response data
            response_data = {
                "success": True,
                "message": f"Found {len(entries)} contact(s) with {contacts_with_money} having money amounts",
                "text": stringified_entries,
                "entries": merged_entries,
                "keywords_used": all_keywords_used,
                "summary": summary,
                "pdf_filename": file.filename or "",
                "total_pages": total_pages,
                "provider": provider
            }
            
            # Save to database if requested and account number is available
            database_result = None
            if save_to_db and summary.get("account"):
                try:
                    # Use invoice as invoice_number if present
                    invoice_number = summary.get("invoice")
                    
                    # Get existing records for account (may include multiple invoices)
                    existing_records = db.get_billing_data(summary["account"])
                    
                    # Determine if invoice already exists
                    existing_match = None
                    if invoice_number:
                        for rec in existing_records:
                            if rec.get("invoice_number") and str(rec.get("invoice_number")) == str(invoice_number):
                                existing_match = rec
                                break
                    
                    if existing_match:
                        # Invoice already exists -> report exists
                        response_data["database"] = {
                            "saved": True,
                            "action": "exists",
                            "record_id": existing_match.get("id"),
                            "account_number": summary["account"],
                            "invoice_number": existing_match.get("invoice_number")
                        }
                        response_data["message"] += f" | Account {summary['account']} invoice {existing_match.get('invoice_number')} already exists in database"
                    else:
                        # Prepare data to save (complete response without success/message)
                        data_to_save = {
                            "entries": merged_entries,
                            "summary": summary,
                            "pdf_filename": file.filename or "",
                            "total_pages": total_pages,
                            "provider": provider,
                            "keywords_used": all_keywords_used,
                            "extraction_date": datetime.datetime.now().isoformat(),
                            "contacts_found": len(entries),
                            "contacts_with_money": contacts_with_money
                        }
                        
                        database_result = db.save_billing_data(summary["account"], data_to_save, invoice_number=invoice_number)
                        
                        if database_result and database_result.get("success"):
                            response_data["database"] = {
                                "saved": True,
                                "action": database_result.get("action"),
                                "record_id": database_result.get("id"),
                                "account_number": summary["account"],
                                "invoice_number": invoice_number
                            }
                            response_data["message"] += f" | Data {database_result.get('action')} in database"
                        else:
                            # Save failed -> include error details and do not return DB-only object
                            response_data["database"] = {
                                "saved": False,
                                "error": database_result.get("error") if database_result else "Unknown error"
                            }
                            response_data["message"] += " | Failed to save to database"
                
                except Exception as db_error:
                    print(f"Database save error: {str(db_error)}")
                    response_data["database"] = {
                        "saved": False,
                        "error": str(db_error)
                    }
                    response_data["message"] += " | Database save failed"
            elif save_to_db and not summary.get("account"):
                response_data["database"] = {
                    "saved": False,
                    "error": "No account number found in bill summary"
                }
                response_data["message"] += " | Cannot save: No account number found"
            
            # If a DB save succeeded or invoice existed, return only the database object
            db_info = response_data.get("database", {})
            if db_info.get("saved") is True:
                only_db_response = {
                    "saved": True,
                    "action": db_info.get("action"),
                    "record_id": db_info.get("record_id"),
                    "account_number": db_info.get("account_number"),
                    "invoice_number": db_info.get("invoice_number")
                }
                return jsonify(only_db_response), 200
            # Otherwise return the original full response
            return jsonify(response_data), 200
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Error in PDF extraction: {str(e)}")
            print(f"Traceback: {error_details}")
            
            return jsonify({
                "success": False,
                "message": f"Error extracting text: {str(e)}",
                "text": "",
                "entries": [],
                "pdf_filename": getattr(file, 'filename', '') if 'file' in locals() else "",
                "total_pages": total_pages if 'total_pages' in locals() else 0
            }), 500

# Add new routes for database operations
@blp.route("/billing-data/<account_number>")
class BillingDataView(MethodView):

    def get(self, account_number):
        """Retrieve billing data for a specific account (returns all invoices for that account)"""
        try:
            data = db.get_billing_data(account_number)
            if data:
                for invoice in data:
                    # Safely get json_data as dict
                    json_data = invoice.get("json_data", {})
                    if not isinstance(json_data, dict):
                        json_data = {}

                    # Get summary from json_data if available, else from invoice
                    summary = json_data.get("summary", invoice.get("summary", {}))

                    # total_charges
                    total_charges = summary.get("total_charges")
                    if not total_charges:
                        total_charges_entry = next(
                            (item for item in summary.get("money_amounts", []) if item.get("ukey") == "total_charges"),
                            None
                        )
                        total_charges = total_charges_entry.get("amount") if total_charges_entry else None
                    invoice["total_charges"] = total_charges

                    # billing_period
                    billing_period = summary.get("billing_period")
                    if not billing_period:
                        billing_period_entry = next(
                            (item for item in summary.get("money_amounts", []) if item.get("ukey") == "billing_period"),
                            None
                        )
                        billing_period = billing_period_entry.get("amount") if billing_period_entry else None
                    invoice["billing_period"] = billing_period

                    # Also keep in summary for compatibility
                    if isinstance(invoice.get("summary"), dict):
                        invoice["summary"]["total_charges"] = total_charges
                        invoice["summary"]["billing_period"] = billing_period

                    # Add entries from json_data if present
                    # Only include name, phone, and "Total Current Charges" amount
                    filtered_entries = []
                    name_phone_map = {}
                    name_count = {}

                    for entry in json_data.get("entries", []):
                        name = entry.get("name") or entry.get("text")
                        phone = entry.get("phone")
                        total_current_charges = None
                        for money in entry.get("money_amounts", []):
                            if money.get("keyword") == "Total Current Charges":
                                total_current_charges = money.get("amount")
                                break

                        # Track name and phone combinations
                        if name not in name_phone_map:
                            name_phone_map[name] = set()
                        name_phone_map[name].add(phone)

                        # Count unique phones per name
                        name_count[name] = len(name_phone_map[name])

                    # Second pass to build filtered_entries with roman numeral if needed
                    for entry in json_data.get("entries", []):
                        name = entry.get("name") or entry.get("text")
                        phone = entry.get("phone")
                        total_current_charges = None
                        for money in entry.get("money_amounts", []):
                            if money.get("keyword") == "Total Current Charges":
                                total_current_charges = money.get("amount")
                                break

                        display_name = name
                        if name_count[name] > 1:
                            # If this name has multiple phones, append II for all but the first phone
                            phones = list(name_phone_map[name])
                            if phones.index(phone) > 0:
                                display_name = f"{name} II"

                        filtered_entries.append({
                            "name": display_name,
                            "phone": phone,
                            "total_current_charges": total_current_charges
                        })
                    invoice["entries"] = filtered_entries

                return jsonify({
                    "success": True,
                    "account_number": account_number,
                    "invoices": data,
                    "total_invoices": len(data)
                }), 200
            else:
                return jsonify({
                    "success": False,
                    "message": "Account not found or no invoices available"
                }), 404

        except Exception as e:
            return jsonify({
                "success": False,
                "message": f"Error retrieving data: {str(e)}"
            }), 500
    
    def delete(self, account_number):
        """Delete billing data for a specific account (removes all invoices for that account)"""
        try:
            result = db.delete_billing_data(account_number)
            if result["success"]:
                return jsonify(result), 200
            else:
                return jsonify(result), 500
                
        except Exception as e:
            return jsonify({
                "success": False,
                "message": f"Error deleting data: {str(e)}"
            }), 500

# New endpoint: get by invoice number
@blp.route("/billing-data/invoice/<invoice_number>")
class BillingDataByInvoiceView(MethodView):
    def get(self, invoice_number):
        """Retrieve a billing record by invoice number"""
        try:
            data = db.get_billing_data_by_invoice(invoice_number)
            if data:
                return jsonify({
                    "success": True,
                    "invoice_number": invoice_number,
                    "record": data
                }), 200
            else:
                return jsonify({
                    "success": False,
                    "message": "Invoice not found"
                }), 404
        except Exception as e:
            return jsonify({
                "success": False,
                "message": f"Error retrieving invoice data: {str(e)}"
            }), 500

@blp.route("/billing-accounts")
class BillingAccountsView(MethodView):
    # ...existing code...
    def get(self):
        """List all accounts in the database"""
        try:
            accounts = db.list_all_accounts(include_json=True)
            return jsonify({
                "success": True,
                "accounts": accounts,
                "total_count": len(accounts)
            }), 200
            
        except Exception as e:
            return jsonify({
                "success": False,
                "message": f"Error listing accounts: {str(e)}"
            }), 500