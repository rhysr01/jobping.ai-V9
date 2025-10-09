# ⚠️ Python Upgrade Required for JobSpy

## Current Issue

**Your Python**: 3.9.6  
**JobSpy Requires**: 3.10+

JobSpy won't install until you upgrade Python.

---

## 🚀 Quick Fix (macOS)

### Option 1: Homebrew (Recommended)

```bash
# Install Homebrew if needed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python 3.11
brew install python@3.11

# Link it as default python3
brew link python@3.11 --force

# Verify
python3 --version  # Should show 3.11.x
```

### Option 2: Download from python.org

1. Go to https://www.python.org/downloads/
2. Download Python 3.11+ installer for macOS
3. Run the installer
4. Verify: `python3 --version`

---

## 📦 After Upgrading Python

Install JobSpy:
```bash
pip3 install python-jobspy
```

Then run the scraper:
```bash
./scripts/run-jobspy-daily.sh
```

---

## 💡 Alternative: Use Docker (No Python Upgrade Needed)

If you don't want to upgrade Python, we can Dockerize the scraper:

```bash
# Create Dockerfile
cat > Dockerfile.jobspy << 'DOCKER'
FROM python:3.11-slim
WORKDIR /app
RUN pip install python-jobspy
COPY scripts/jobspy-save.cjs .
COPY .env.local .
CMD ["node", "jobspy-save.cjs"]
DOCKER

# Build
docker build -f Dockerfile.jobspy -t jobping-scraper .

# Run daily
docker run --rm jobping-scraper
```

Let me know which approach you prefer!

---

**For now**: The manual scraping is on hold until Python is upgraded. Your other scrapers (RSS feeds, etc.) are still working! ✅
