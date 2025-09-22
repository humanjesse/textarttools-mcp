#!/bin/bash

# Bulk upload script for figlet fonts to Cloudflare R2
# Usage: ./upload-fonts.sh

BUCKET_NAME="textarttools-figlet-fonts"
FONTS_DIR="figlet-fonts/standard"
BATCH_SIZE=10
TOTAL_UPLOADED=0
FAILED_UPLOADS=0

echo "🚀 Starting bulk upload of figlet fonts to R2..."
echo "📁 Source directory: $FONTS_DIR"
echo "🪣 Target bucket: $BUCKET_NAME"
echo ""

# Check if fonts directory exists
if [ ! -d "$FONTS_DIR" ]; then
    echo "❌ Error: Fonts directory '$FONTS_DIR' not found!"
    exit 1
fi

# Count total fonts
TOTAL_FONTS=$(find "$FONTS_DIR" -name "*.flf" | wc -l)
echo "📊 Total fonts to upload: $TOTAL_FONTS"
echo ""

# Function to upload a single font
upload_font() {
    local font_file="$1"
    local font_name=$(basename "$font_file")
    local object_path="$BUCKET_NAME/fonts/$font_name"

    echo -n "📤 Uploading $font_name... "

    if npx wrangler r2 object put "$object_path" --file="$font_file" --content-type="text/plain" 2>/dev/null; then
        echo "✅"
        ((TOTAL_UPLOADED++))
        return 0
    else
        echo "❌"
        ((FAILED_UPLOADS++))
        return 1
    fi
}

# Upload fonts in batches
echo "⏳ Starting upload process..."
echo ""

batch_count=0
for font_file in "$FONTS_DIR"/*.flf; do
    if [ -f "$font_file" ]; then
        upload_font "$font_file"

        ((batch_count++))

        # Small delay every batch to avoid rate limiting
        if [ $((batch_count % BATCH_SIZE)) -eq 0 ]; then
            echo "⏸️  Batch of $BATCH_SIZE completed. Brief pause..."
            sleep 2
        fi
    fi
done

echo ""
echo "🎉 Upload process completed!"
echo "✅ Successfully uploaded: $TOTAL_UPLOADED fonts"
echo "❌ Failed uploads: $FAILED_UPLOADS fonts"
echo "📊 Success rate: $(( (TOTAL_UPLOADED * 100) / TOTAL_FONTS ))%"

if [ $FAILED_UPLOADS -gt 0 ]; then
    echo ""
    echo "⚠️  Some uploads failed. You may want to retry or upload manually."
fi

echo ""
echo "🔍 To verify uploads, visit: https://dash.cloudflare.com/r2"