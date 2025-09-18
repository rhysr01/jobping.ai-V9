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
