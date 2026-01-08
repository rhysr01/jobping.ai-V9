# 🛠️ Automated Database Maintenance via MCP

Your Supabase MCP server now automatically executes maintenance migrations for you!

## 🎯 How to Use

### Method 1: Tell Claude Desktop (Easiest)
Simply tell Claude Desktop: **"Run the maintenance migrations"**

Claude will automatically execute all the maintenance scripts and filter out non-business jobs.

### Method 2: Specific Migration Types
Tell Claude: **"Run only the CEO executive filtering"**

Available options:
- `company_names` - Fix missing company names
- `location_extraction` - Extract cities/countries from job locations
- `job_board_filter` - Remove jobs from Indeed, Reed, etc.
- `ceo_executive` - Filter CEO and executive roles
- `construction` - Filter construction and building trades
- `medical` - Filter doctors, nurses, healthcare roles
- `legal` - Filter lawyers, solicitors (keeps compliance)
- `teaching` - Filter teachers, professors (keeps business trainers)
- `rls_security` - Enable Row Level Security

### Method 3: Manual Command
```bash
npm run mcp:start
```
Then tell Claude to use the `supabase_run_maintenance_migrations` tool.

## 🚀 What It Does Automatically

1. **Data Quality**: Fixes missing company names, extracts locations
2. **Job Board Filtering**: Removes Indeed, Reed, Google job postings
3. **Role Filtering**: Removes 1000s of non-business graduate jobs:
   - CEOs, CFOs, CTOs, Managing Directors
   - Construction workers, electricians, plumbers
   - Doctors, nurses, pharmacists, therapists
   - Lawyers, solicitors, barristers
   - Teachers, lecturers, professors
4. **Security**: Enables RLS on all database tables

## 📊 Results

After running, you'll see dramatic improvements:
- ✅ **Better job quality** for business graduates
- ✅ **Cleaner matching results**
- ✅ **Reduced noise** in job recommendations
- ✅ **Improved user experience**

## 🔧 Technical Details

- **Tool Name**: `supabase_run_maintenance_migrations`
- **Safe to Run**: Idempotent - can run multiple times
- **Timeout-Safe**: Each migration processes ≤1000 rows max
- **Error Handling**: Detailed success/failure reporting

## 📞 Support

If you encounter issues, the MCP server will provide detailed error messages. You can also run individual migrations manually using the `./run_maintenance_migrations.sh` script.
