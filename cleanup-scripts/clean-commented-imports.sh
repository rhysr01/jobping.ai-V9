#!/bin/bash

echo "📦 JobPing Commented Import Cleanup"
echo "==================================="

# Create backup
echo "📦 Creating backup..."
mkdir -p cleanup-backups
tar -czf cleanup-backups/before-import-cleanup-$(date +%Y%m%d-%H%M%S).tar.gz \
  --exclude=node_modules \
  --exclude=cleanup-backups \
  --exclude=cleanup-reports \
  .

echo "🔍 Analyzing commented imports..."

# Process each file with commented imports
while IFS= read -r line; do
  if [[ "$line" =~ ^(.+):([0-9]+):(.*)$ ]]; then
    file="${BASH_REMATCH[1]}"
    line_num="${BASH_REMATCH[2]}"
    content="${BASH_REMATCH[3]}"
    
    # Skip if it's just a documentation comment
    if [[ "$content" =~ "Polyfill|Example|Note:|TODO:|removed" ]]; then
      echo "📝 Skipping documentation: $file:$line_num"
      continue
    fi
    
    # Skip jest setup files (those are intentional polyfills)
    if [[ "$file" =~ jest\.setup\. ]]; then
      echo "🧪 Skipping test setup: $file:$line_num"
      continue
    fi
    
    echo "🗑️  Would remove: $file:$line_num"
    echo "    $content"
    
    # Actually remove the line (commented for safety)
    # sed -i "${line_num}d" "$file"
    
  fi
done < cleanup-reports/commented-imports.txt

echo ""
echo "⚠️  Dry run complete! Uncomment the sed line to actually remove imports"
echo "📋 Review the list above to ensure no important comments are removed"

# Create a safe removal script
cat > cleanup-scripts/remove-commented-imports.sh << 'EOF'
#!/bin/bash

echo "🗑️  Removing commented imports..."

# Process files and remove commented import lines
while IFS= read -r line; do
  if [[ "$line" =~ ^(.+):([0-9]+):(.*)$ ]]; then
    file="${BASH_REMATCH[1]}"
    line_num="${BASH_REMATCH[2]}"
    content="${BASH_REMATCH[3]}"
    
    # Skip documentation comments
    if [[ "$content" =~ "Polyfill|Example|Note:|TODO:|removed|Removed" ]]; then
      continue
    fi
    
    # Skip jest setup
    if [[ "$file" =~ jest\.setup\. ]]; then
      continue
    fi
    
    echo "   Removing from $file:$line_num"
    
    # Create backup and remove line
    cp "$file" "${file}.bak"
    sed -i "${line_num}d" "$file"
  fi
done < cleanup-reports/commented-imports.txt

echo "✅ Commented import cleanup complete"
echo "📝 .bak files created for safety"
EOF

chmod +x cleanup-scripts/remove-commented-imports.sh

echo "✅ Import cleanup analysis complete!"
echo "🔧 Run './cleanup-scripts/remove-commented-imports.sh' to remove commented imports"
