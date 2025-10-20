from marshmallow import Schema, fields, ValidationError

class SubKeyMoneyAmountSchema(Schema):
    """Schema for sub-key money amounts nested under parent keywords"""
    amount = fields.Str(required=True)
    keyword = fields.Str(required=True)
    name = fields.Str(required=True)  # Added display name
    ukey = fields.Str(required=True)
    search_term = fields.Str(required=True)
    search_range_used = fields.Int(required=True)  # Added search range used
    inline_context = fields.Str(required=True)
    page = fields.Int(required=True)
    contact_match_type = fields.List(fields.Str(), required=True)

class MoneyAmountSchema(Schema):
    """Schema for money amounts found for contacts"""
    amount = fields.Str(required=True)
    keyword = fields.Str(required=True)
    name = fields.Str(required=True)  # Added display name
    ukey = fields.Str(required=True)
    search_term = fields.Str(required=True)
    search_range_used = fields.Int(required=True)  # Added search range used
    inline_context = fields.Str(required=True)
    page = fields.Int(required=True)
    contact_match_type = fields.List(fields.Str(), required=True)
    sub_keys = fields.List(fields.Nested(SubKeyMoneyAmountSchema), required=True)

class BillSummaryMoneyAmountSchema(Schema):
    """Schema for money amounts found in bill summary page"""
    sentence = fields.Str(required=True)
    name = fields.Str(required=True)  # Added display name
    ukey = fields.Str(required=True)
    amount = fields.Str(required=True)
    inline_context = fields.Str(required=True)
    page = fields.Int(required=True)
    type = fields.Str(required=True)

class LateFeeSchema(Schema):
    """Schema for late fee entries"""
    amount = fields.Str(required=True)
    sentence = fields.Str(required=True)
    name = fields.Str(required=True)  # Added display name
    ukey = fields.Str(required=True)
    inline_context = fields.Str(required=True)
    page = fields.Int(required=True)

class PreviousBalanceSchema(Schema):
    """Schema for previous balance entries"""
    amount = fields.Str(required=True)
    date = fields.Str(required=True)  # Added date field for mm/dd/yy format
    sentence = fields.Str(required=True)
    name = fields.Str(required=True)
    ukey = fields.Str(required=True)
    header_type = fields.Str(required=True)
    inline_context = fields.Str(required=True)
    page = fields.Int(required=True)

class ContactEntrySchema(Schema):
    """Schema for individual contact entries"""
    phone = fields.Str(required=True)
    name = fields.Str(required=True)
    money_amounts = fields.List(fields.Nested(MoneyAmountSchema), required=True)

class SummarySchema(Schema):
    """Schema for the summary object containing billing details and money amounts"""
    invoice = fields.Str(allow_none=True, required=True)
    account = fields.Str(allow_none=True, required=True)
    billing_period = fields.Str(allow_none=True, required=True)
    due_date = fields.Str(allow_none=True, required=True)
    total_charges = fields.Str(allow_none=True, required=True)
    money_amounts = fields.List(fields.Nested(BillSummaryMoneyAmountSchema), required=True)
    late_fees = fields.List(fields.Nested(LateFeeSchema), required=True)
    previous_balance = fields.List(fields.Nested(PreviousBalanceSchema), required=True)

class PDFTextExtractionSchema(Schema):
    """Schema for PDF text extraction response"""
    success = fields.Bool(required=True)
    message = fields.Str(required=True)
    text = fields.Str(required=True)
    entries = fields.List(fields.Nested(ContactEntrySchema), required=True)
    keywords_used = fields.List(fields.Str(), required=True)
    summary = fields.Nested(SummarySchema, required=True)