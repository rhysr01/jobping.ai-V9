# 🔍 Signup Form Debug Guide

## 🚨 **Issue: Form Won't Submit**

### **Possible Causes:**

1. **Career Path Not Selected**
   - Button is disabled if `!formData.careerPath`
   - Check if user clicked a career path option

2. **Required Fields Missing**
   - API validates: `email`, `fullName`, `cities` (must have at least 1)
   - Check if all required fields are filled

3. **Form Validation Issues**
   - Check browser console for JavaScript errors
   - Check network tab for API errors

---

## 🛠️ **Debug Steps:**

### **Step 1: Check Form State**
Open browser console and run:
```javascript
// Check current form data
console.log(window.formData || 'Form data not available');

// If using React DevTools, check component state
```

### **Step 2: Check Button State**
```javascript
// Check if button is disabled
const submitBtn = document.querySelector('button[onclick*="handleSubmit"]');
console.log('Button disabled:', submitBtn?.disabled);
console.log('Button text:', submitBtn?.textContent);
```

### **Step 3: Check Required Fields**
```javascript
// Check required fields
const email = document.querySelector('input[type="email"]');
const name = document.querySelector('input[type="text"]');
const cities = document.querySelectorAll('input[type="checkbox"]:checked');

console.log('Email:', email?.value);
console.log('Name:', name?.value);
console.log('Cities selected:', cities.length);
```

### **Step 4: Check Career Path Selection**
```javascript
// Check if career path is selected
const careerPaths = document.querySelectorAll('button[onclick*="careerPath"]');
const selected = Array.from(careerPaths).find(btn => 
  btn.className.includes('border-brand-500')
);
console.log('Career path selected:', !!selected);
```

---

## 🔧 **Quick Fixes:**

### **Fix 1: Remove Career Path Requirement**
If career path selection is buggy, temporarily remove the validation:

```typescript
// In signup/page.tsx line 648
disabled={loading} // Remove: !formData.careerPath ||
```

### **Fix 2: Add Debug Logging**
Add this to `handleSubmit` function:

```typescript
const handleSubmit = async () => {
  console.log('Form data:', formData); // DEBUG
  console.log('Career path:', formData.careerPath); // DEBUG
  console.log('Cities:', formData.cities); // DEBUG
  
  setLoading(true);
  // ... rest of function
};
```

### **Fix 3: Check API Response**
Add error logging:

```typescript
const response = await fetch('/api/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData),
});

console.log('Response status:', response.status); // DEBUG
const result = await response.json();
console.log('Response data:', result); // DEBUG
```

---

## 🎯 **Most Likely Issues:**

### **Issue 1: Career Path Not Selected**
**Symptoms:** Button is grayed out/disabled
**Fix:** Make sure user clicks on a career path option

### **Issue 2: Missing Cities**
**Symptoms:** Form submits but API returns 400 error
**Fix:** Make sure user selects at least 1 city

### **Issue 3: Email Already Exists**
**Symptoms:** Form submits but fails silently
**Fix:** Try with a different email address

### **Issue 4: JavaScript Error**
**Symptoms:** Nothing happens when clicking submit
**Fix:** Check browser console for errors

---

## 🚀 **Quick Test:**

1. **Open browser console** (F12)
2. **Fill out form** with test data:
   - Email: `test@example.com`
   - Name: `Test User`
   - Cities: Select at least 1 (e.g., London)
   - Career Path: Click any option
   - Languages: Select at least 1 (e.g., English)
3. **Click submit** and watch console for errors
4. **Check network tab** for API calls

---

## 📞 **If Still Not Working:**

Run this debug command in browser console:

```javascript
// Complete form state check
const form = document.querySelector('form') || document;
const inputs = form.querySelectorAll('input, select, textarea');
const data = {};
inputs.forEach(input => {
  if (input.type === 'checkbox') {
    if (input.checked) {
      data[input.name] = (data[input.name] || []).concat([input.value]);
    }
  } else {
    data[input.name] = input.value;
  }
});
console.log('Form data:', data);

// Check button state
const submitBtn = document.querySelector('button[onclick*="handleSubmit"]');
console.log('Submit button:', {
  disabled: submitBtn?.disabled,
  visible: submitBtn?.offsetParent !== null,
  text: submitBtn?.textContent?.trim()
});
```

---

**This will help identify exactly what's preventing the form from submitting!** 🔍
