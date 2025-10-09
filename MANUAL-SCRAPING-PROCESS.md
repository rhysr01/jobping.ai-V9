# 📥 Manual JobSpy Scraping Process

## Why Manual?

The GitHub Actions workflow for JobSpy has been unreliable. Since JobSpy works great when run manually and scrapes LinkedIn, Indeed, Glassdoor, and ZipRecruiter, we're using a manual daily execution process for now.

---

## 🚀 Daily Scraping Routine

### **Run Once Per Day:**

```bash
./scripts/run-jobspy-daily.sh
```

**Time**: ~5-10 minutes  
**Frequency**: Once daily (morning recommended)  
**Sources**: LinkedIn, Indeed, Glassdoor, ZipRecruiter  
**Output**: New jobs added to Supabase `jobs` table

---

## ⏰ Recommended Schedule

**Best time**: 9:00 AM (after companies post morning jobs)

### Option 1: Manual Daily (Simplest)
- Set phone reminder for 9 AM
- Run `./scripts/run-jobspy-daily.sh`
- Check output, verify jobs added
- Done! ✅

### Option 2: Local Cron (Automated)
```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 9 AM)
0 9 * * * cd /Users/rhysrowlands/jobping && ./scripts/run-jobspy-daily.sh >> /tmp/jobspy.log 2>&1
```

### Option 3: macOS Launchd (Most Reliable)
```bash
# Create launch agent
mkdir -p ~/Library/LaunchAgents

# Create plist file
cat > ~/Library/LaunchAgents/com.jobping.scraper.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.jobping.scraper</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/rhysrowlands/jobping/scripts/run-jobspy-daily.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/jobping-scraper.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/jobping-scraper-error.log</string>
</dict>
</plist>
PLIST

# Load it
launchctl load ~/Library/LaunchAgents/com.jobping.scraper.plist
```

---

## 📊 What Gets Scraped

**Cities** (from `jobspy-save.cjs`):
- Berlin, Munich, Amsterdam, Paris, London, Dublin, etc.

**Search Terms**:
- "graduate programme"
- "entry level"
- "junior developer"
- "internship"

**Sources**:
- LinkedIn
- Indeed
- Glassdoor
- ZipRecruiter

**Filters**:
- EU/UK locations only
- Posted in last 30 days
- De-duplicated by job_hash

---

## 🔍 Verify It Worked

After running, check:

```sql
-- In Supabase SQL Editor
SELECT COUNT(*), MAX(created_at) 
FROM jobs 
WHERE created_at > NOW() - INTERVAL '1 day';
```

Should show new jobs from today!

---

## 🐛 Troubleshooting

**"JobSpy not found"** or **"No matching distribution"**:

Your Python version may be too old (JobSpy requires Python 3.10+).

Check version:
```bash
python3 --version
```

If < 3.10, upgrade Python:
```bash
# macOS (using Homebrew)
brew install python@3.11
brew link python@3.11

# Or download from python.org
```

Then install JobSpy:
```bash
pip3 install python-jobspy
```

**"No jobs found"**:
- JobSpy APIs may be rate-limited
- Wait 1 hour and retry
- Check if LinkedIn changed their structure

**"Database error"**:
- Verify .env.local has SUPABASE credentials
- Check Supabase is accessible

---

## 💡 Pro Tips

1. **Run in morning** - Fresh jobs posted overnight
2. **Check logs** - Review what was scraped
3. **Monitor quality** - Adjust search terms if needed
4. **Backup plan** - If JobSpy breaks, you have other scrapers

---

## 🔄 Future: Re-enable Automation

Once JobSpy GitHub Actions is fixed:
1. Update `.github/workflows/scrape-jobs.yml`
2. Test the workflow
3. Re-enable automated scraping
4. Stop manual execution

For now: **Manual is reliable and working!** ✅

---

**Run it once now to test**: `./scripts/run-jobspy-daily.sh`
