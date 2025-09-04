# USA Job Cleanup Guide

## 🎯 **What This Script Does**

The cleanup script automatically identifies and removes:
- ✅ **USA jobs** (any job with USA location)
- ✅ **Non-European jobs** (Canada, Australia, Asia, etc.)
- ✅ **Clearly irrelevant jobs** (truck driver, construction, etc.)
- ✅ **Uncertain jobs are kept** to avoid false positives

## 🚀 **How to Use**

### **1. Preview What Would Be Removed (Safe)**
```bash
node scripts/cleanup-usa-irrelevant-jobs.js --dry-run
```
This shows you exactly what would be removed without actually removing anything.

### **2. Actually Remove the Jobs**
```bash
node scripts/cleanup-usa-irrelevant-jobs.js
```
This will remove all identified USA and irrelevant jobs.

### **3. Process All Jobs (Large Databases)**
```bash
node scripts/cleanup-usa-irrelevant-jobs.js --all
```
By default, it processes 1000 jobs. Use `--all` for unlimited processing.

## 📊 **What Gets Removed**

### **USA Locations (100% Removal)**
- New York, Los Angeles, Chicago, Houston, Miami
- All US states (California, Texas, Florida, etc.)
- Any job mentioning "USA", "United States", "American"

### **Non-European Countries (100% Removal)**
- Canada, Australia, New Zealand, Japan, China, India
- Brazil, Mexico, Argentina, Chile, Peru
- South Africa, Nigeria, Egypt, Morocco
- Saudi Arabia, UAE, Qatar, Israel, Lebanon
- Thailand, Vietnam, Malaysia, Singapore, Indonesia
- And many more...

### **Clearly Irrelevant Job Types (100% Removal)**
- **Transportation**: Truck driver, delivery driver, taxi driver
- **Construction**: Plumber, electrician, carpenter, painter
- **Healthcare**: Nurse, doctor, dentist, pharmacist
- **Education**: Teacher, professor, librarian
- **Service**: Chef, waiter, bartender, cashier
- **Manual Labor**: Construction worker, landscaper, janitor
- **Entertainment**: Actor, musician, model, influencer
- **And many more clearly irrelevant roles**

### **What Gets Kept (Uncertain)**
- Jobs that might be relevant but aren't clearly irrelevant
- Jobs with unclear location information
- Jobs that could be early-career but aren't obvious
- Any job where the script isn't 100% sure it should be removed

## 🔍 **Example Output**

```
📊 Job Analysis Results:
   • Total jobs analyzed: 1000
   • USA jobs found: 45
   • Clearly irrelevant jobs: 23
   • Uncertain jobs (keeping): 932
   • Jobs to remove: 68
   • Jobs to keep: 932

🗑️  Removing 45 jobs (USA location)...
✅ Successfully removed 45 jobs

🗑️  Removing 23 jobs (clearly irrelevant)...
✅ Successfully removed 23 jobs

📊 Cleanup Summary:
   • Total jobs processed: 1000
   • USA jobs removed: 45
   • Irrelevant jobs removed: 23
   • Jobs kept (uncertain): 932
   • Total jobs removed: 68
   • Jobs remaining: 932

🎯 Database cleaned up successfully!
   • Removed 68 irrelevant jobs
   • Kept 932 potentially relevant jobs
```

## 🛡️ **Safety Features**

### **Conservative Approach**
- **Only removes jobs that are 100% clearly irrelevant**
- **Keeps any job where there's uncertainty**
- **No false positives** - better to keep a job than remove a good one

### **Dry Run Mode**
- **Always test with `--dry-run` first**
- **See exactly what would be removed**
- **No risk of accidentally removing good jobs**

### **Batch Processing**
- **Processes jobs in batches** to avoid overwhelming the database
- **Error handling** for each batch
- **Continues processing** even if some batches fail

## 🎯 **When to Use**

### **Use This Script When:**
- ✅ You have USA jobs in your database
- ✅ You have clearly irrelevant jobs (truck driver, construction, etc.)
- ✅ You want to clean up your job database
- ✅ You want to ensure only European, relevant jobs remain

### **Don't Use This Script When:**
- ❌ You're unsure about what jobs should be removed
- ❌ You want to remove jobs that might be relevant
- ❌ You haven't tested with `--dry-run` first

## 🚀 **Recommended Workflow**

1. **First Run (Preview)**
   ```bash
   node scripts/cleanup-usa-irrelevant-jobs.js --dry-run
   ```

2. **Review the Output**
   - Check that only clearly irrelevant jobs are marked for removal
   - Verify no good jobs are being removed

3. **Actual Cleanup**
   ```bash
   node scripts/cleanup-usa-irrelevant-jobs.js
   ```

4. **Verify Results**
   - Check your database
   - Ensure only relevant European jobs remain

## 🔧 **Configuration Options**

### **Environment Variables**
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Command Line Options**
```bash
--dry-run       # Preview only (safe)
--all           # Process all jobs (not just 1000)
--verbose       # Detailed logging
--help          # Show help
```

## ✅ **Benefits**

1. **Clean Database**: Remove USA and irrelevant jobs
2. **European Focus**: Only European jobs remain
3. **JobPing Relevance**: Jobs match your customer base
4. **Safe Operation**: Conservative approach prevents false positives
5. **Easy to Use**: Simple command line interface
6. **Reversible**: You can always re-add jobs if needed

## 🎯 **Ready to Clean Up?**

Start with a dry run to see what would be removed:

```bash
node scripts/cleanup-usa-irrelevant-jobs.js --dry-run
```

This will show you exactly what the script found and what it would remove, with no risk to your data!
