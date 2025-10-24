import sqlite3
import json
import os
import shutil
from datetime import datetime

class BillingDatabase:
    def __init__(self, db_path=None):
        if db_path is None:
            # Detect if running locally or on cloud platform
            if self.is_cloud_environment():
                # For cloud deployment - use temporary storage with warning
                self.db_path = '/tmp/billing_data.db'
                print("WARNING: Running on cloud platform. Database will be temporary and reset on restart.")
                print("Consider using a cloud database service for persistent storage.")
            else:
                # For local development - use C:/simplifybill/
                local_dir = "C:/simplifybill"
                
                # Create directory if it doesn't exist               
                try:
                    os.makedirs(local_dir)
                    print(f"Created directory: {local_dir}")
                except OSError as e:
                    print(f"Error creating directory {local_dir}: {str(e)}")
                    # Fallback to current directory
                    current_dir = os.path.dirname(os.path.abspath(__file__))
                    bill_server_dir = os.path.dirname(current_dir)
                    local_dir = bill_server_dir
                    print(f"Falling back to: {local_dir}")
                
                self.db_path = os.path.join(local_dir, 'billing_data.db')
        else:
            self.db_path = db_path
        
        self.init_database()
    
    def is_cloud_environment(self):
        """Detect if running on a cloud platform"""
        # Check for common cloud environment variables
        cloud_indicators = [
            'RENDER',           # Render
            'HEROKU',           # Heroku
            'VERCEL',           # Vercel
            'RAILWAY',          # Railway
            'DYNO',             # Heroku dyno
            'PORT',             # Generic cloud port
        ]
        
        # Check if any cloud environment variables exist
        for indicator in cloud_indicators:
            if os.getenv(indicator):
                return True
        # Check if running on Linux (common for cloud platforms)
        if os.name == 'posix' and not os.path.exists('/Users'):  # Not macOS
            return True
            
        return False
    
    def get_environment_info(self):
        """Get information about the current environment"""
        return {
            "is_cloud": self.is_cloud_environment(),
            "os_name": os.name,
            "platform": os.getenv('RENDER_SERVICE_NAME', 'local'),
            "database_path": self.db_path,
            "persistent_storage": not self.is_cloud_environment()
        }
    
    def init_database(self):
        """Initialize the database and create the table if it doesn't exist.
           Also migrate schema to include invoice_number column if missing."""
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                # Create table (invoice_number included)
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS billing_records (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        account_number TEXT NOT NULL,
                        invoice_number TEXT,
                        json_data TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Create indices
                cursor.execute('''
                    CREATE INDEX IF NOT EXISTS idx_account_number 
                    ON billing_records(account_number)
                ''')
                cursor.execute('''
                    CREATE INDEX IF NOT EXISTS idx_invoice_number
                    ON billing_records(invoice_number)
                ''')
                
                conn.commit()
                
                # Migration: ensure invoice_number column exists; if older schema used voucher_number, copy values
                cursor.execute("PRAGMA table_info(billing_records)")
                cols = [row[1] for row in cursor.fetchall()]
                if 'invoice_number' not in cols:
                    try:
                        cursor.execute("ALTER TABLE billing_records ADD COLUMN invoice_number TEXT")
                        conn.commit()
                        print("Migrated database: added invoice_number column")
                    except Exception:
                        pass
                
                # If older DB had voucher_number, copy values into invoice_number for compatibility
                if 'voucher_number' in cols and 'invoice_number' in cols:
                    try:
                        cursor.execute("UPDATE billing_records SET invoice_number = voucher_number WHERE (invoice_number IS NULL OR invoice_number = '') AND (voucher_number IS NOT NULL AND voucher_number != '')")
                        conn.commit()
                        print("Copied existing voucher_number values into invoice_number")
                    except Exception:
                        pass
                
                env_info = self.get_environment_info()
                print(f"Database initialized at: {self.db_path}")
                print(f"Environment: {'Cloud' if env_info['is_cloud'] else 'Local'}")
                if env_info['is_cloud']:
                    print("⚠️  WARNING: Database is temporary and will be lost on restart!")
                    
        except Exception as e:
            print(f"Error initializing database: {str(e)}")
            raise
    
    def get_database_info(self):
        """Get information about the database location and size"""
        try:
            env_info = self.get_environment_info()
            
            if os.path.exists(self.db_path):
                file_size = os.path.getsize(self.db_path)
                file_size_mb = round(file_size / (1024 * 1024), 2)
                
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute('SELECT COUNT(*) FROM billing_records')
                    record_count = cursor.fetchone()[0]
                
                return {
                    "database_path": self.db_path,
                    "file_size_bytes": file_size,
                    "file_size_mb": file_size_mb,
                    "record_count": record_count,
                    "exists": True,
                    "environment": env_info,
                    "persistent": not env_info['is_cloud']
                }
            else:
                return {
                    "database_path": self.db_path,
                    "file_size_bytes": 0,
                    "file_size_mb": 0,
                    "record_count": 0,
                    "exists": False,
                    "environment": env_info,
                    "persistent": not env_info['is_cloud']
                }
        except Exception as e:
            return {
                "database_path": self.db_path,
                "error": str(e),
                "exists": False,
                "environment": self.get_environment_info()
            }
    
    def save_billing_data(self, account_number, json_data, invoice_number=None):
        """Save or update billing data for an account. If invoice_number is provided,
           use (account_number, invoice_number) pair to check for existing record and update.
           If invoice_number is not provided, always insert a new record (accounts can have multiple invoices)."""
        try:
            # Convert dict to JSON string if needed
            if isinstance(json_data, dict):
                json_string = json.dumps(json_data, indent=2)
            else:
                json_string = str(json_data)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # If invoice provided, try to find existing record for (account, invoice)
                if invoice_number:
                    cursor.execute(
                        'SELECT id FROM billing_records WHERE account_number = ? AND invoice_number = ?',
                        (account_number, invoice_number)
                    )
                    existing_record = cursor.fetchone()
                    if existing_record:
                        cursor.execute('''
                            UPDATE billing_records
                            SET json_data = ?, updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        ''', (json_string, existing_record[0]))
                        record_id = existing_record[0]
                        action = "updated"
                    else:
                        cursor.execute('''
                            INSERT INTO billing_records (account_number, invoice_number, json_data)
                            VALUES (?, ?, ?)
                        ''', (account_number, invoice_number, json_string))
                        record_id = cursor.lastrowid
                        action = "created"
                else:
                    # No invoice => always create a new record for this account
                    cursor.execute('''
                        INSERT INTO billing_records (account_number, invoice_number, json_data)
                        VALUES (?, ?, ?)
                    ''', (account_number, None, json_string))
                    record_id = cursor.lastrowid
                    action = "created"
                
                conn.commit()
                
                env_info = self.get_environment_info()
                warning = " (TEMPORARY - will be lost on restart)" if env_info['is_cloud'] else ""
                print(f"Record {action} with ID: {record_id} for account: {account_number}{warning}")
                
                return {
                    "success": True, 
                    "id": record_id, 
                    "action": action,
                    "persistent": not env_info['is_cloud']
                }
                
        except Exception as e:
            print(f"Error saving billing data: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_billing_data(self, account_number):
        """Retrieve all billing data records for a specific account (returns list of records)."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, account_number, invoice_number, json_data, created_at, updated_at
                    FROM billing_records
                    WHERE account_number = ?
                    ORDER BY updated_at DESC
                ''', (account_number,))
                
                records = cursor.fetchall()
                if records:
                    result = []
                    for record in records:
                        try:
                            parsed_json = json.loads(record[3])
                        except json.JSONDecodeError:
                            parsed_json = record[3]
                        result.append({
                            "id": record[0],
                            "account_number": record[1],
                            "invoice_number": record[2],
                            "json_data": parsed_json,
                            "created_at": record[4],
                            "updated_at": record[5]
                        })
                    return result
                return []
        except Exception as e:
            print(f"Error retrieving billing data: {str(e)}")
            return []

    def get_billing_data_by_invoice(self, invoice_number):
        """Retrieve a single billing record by invoice number."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, account_number, invoice_number, json_data, created_at, updated_at
                    FROM billing_records
                    WHERE invoice_number = ?
                    LIMIT 1
                ''', (invoice_number,))
                
                record = cursor.fetchone()
                if record:
                    try:
                        parsed_json = json.loads(record[3])
                    except json.JSONDecodeError:
                        parsed_json = record[3]
                    return {
                        "id": record[0],
                        "account_number": record[1],
                        "invoice_number": record[2],
                        "json_data": parsed_json,
                        "created_at": record[4],
                        "updated_at": record[5]
                    }
                return None
        except Exception as e:
            print(f"Error retrieving billing data by invoice: {str(e)}")
            return None

    def list_all_accounts(self, include_json=False):
        """List all accounts in the database grouped by account_number.
           Parent object is account_number, children are invoice records."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                if include_json:
                    cursor.execute('''
                        SELECT id, account_number, invoice_number, json_data, created_at, updated_at 
                        FROM billing_records 
                        ORDER BY account_number, updated_at DESC
                    ''')
                else:
                    cursor.execute('''
                        SELECT id, account_number, invoice_number, created_at, updated_at 
                        FROM billing_records 
                        ORDER BY account_number, updated_at DESC
                    ''')

                records = cursor.fetchall()

                # Group by account_number
                accounts_map = {}
                if include_json:
                    for record in records:
                        rec_id, acct, invoice_num, json_text, created_at, updated_at = record
                        try:
                            parsed_json = json.loads(json_text)
                        except Exception:
                            parsed_json = json_text
                        invoice_obj = {
                            "id": rec_id,
                            "invoice_number": invoice_num,
                            "json_data": parsed_json,
                            "created_at": created_at,
                            "updated_at": updated_at
                        }
                        accounts_map.setdefault(acct, []).append(invoice_obj)
                else:
                    for record in records:
                        rec_id, acct, invoice_num, created_at, updated_at = record
                        invoice_obj = {
                            "id": rec_id,
                            "invoice_number": invoice_num,
                            "created_at": created_at,
                            "updated_at": updated_at
                        }
                        accounts_map.setdefault(acct, []).append(invoice_obj)

                # Build result list: each item is an account with its invoices
                result = []
                for acct, invoices in accounts_map.items():
                    result.append({
                        "account_number": acct,
                        "total_invoices": len(invoices),
                        "invoices": invoices
                    })

                return result
        except Exception as e:
            print(f"Error listing accounts: {str(e)}")
            return []
    
    def delete_billing_data(self, account_number):
        """Delete billing data for a specific account (removes all invoices for that account)"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'DELETE FROM billing_records WHERE account_number = ?',
                    (account_number,)
                )
                
                if cursor.rowcount > 0:
                    conn.commit()
                    print(f"Deleted record(s) for account: {account_number}")
                    return {"success": True, "deleted": True}
                else:
                    return {"success": True, "deleted": False, "message": "Account not found"}
                    
        except Exception as e:
            print(f"Error deleting billing data: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def backup_database(self, backup_path=None):
        """Create a backup of the database"""
        try:
            if backup_path is None:
                # Create backup in the same directory as the database
                db_dir = os.path.dirname(self.db_path)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_path = os.path.join(db_dir, f'billing_data_backup_{timestamp}.db')
            
            # Copy the database file
            shutil.copy2(self.db_path, backup_path)
            
            return {
                "success": True,
                "backup_path": backup_path,
                "original_path": self.db_path
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def vacuum_database(self):
        """Optimize the database by running VACUUM"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('VACUUM')
                conn.commit()
            
            return {
                "success": True,
                "message": "Database optimized successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }