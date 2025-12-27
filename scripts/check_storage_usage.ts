/**
 * Script to check Supabase Storage usage
 * Helps identify what's consuming storage space
 */

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ Loaded environment variables from .env.local`);
} else {
  console.warn('⚠️  .env.local not found, using process.env');
}

import { getDatabaseClient } from '../Utils/databasePool';

async function checkStorageUsage() {
  const supabase = getDatabaseClient();

  console.log('📦 Checking Supabase Storage Buckets...\n');

  try {
    // List all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }

    if (!buckets || buckets.length === 0) {
      console.log('ℹ️  No storage buckets found.');
      return;
    }

    console.log(`Found ${buckets.length} bucket(s):\n`);

    let totalSize = 0;

    for (const bucket of buckets) {
      console.log(`📁 Bucket: ${bucket.name}`);
      console.log(`   Public: ${bucket.public ? 'Yes' : 'No'}`);
      console.log(`   Created: ${bucket.created_at}`);

      // List files in bucket (with pagination)
      let totalFiles = 0;
      let bucketSize = 0;
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: files, error: filesError } = await supabase.storage
          .from(bucket.name)
          .list('', {
            limit: pageSize,
            offset: page * pageSize,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (filesError) {
          console.error(`   ❌ Error listing files: ${filesError.message}`);
          break;
        }

        if (!files || files.length === 0) {
          hasMore = false;
          break;
        }

        totalFiles += files.length;

        // Calculate size (if metadata is available)
        files.forEach(file => {
          if (file.metadata?.size) {
            bucketSize += parseInt(file.metadata.size);
          }
        });

        if (files.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }

      const sizeMB = (bucketSize / 1024 / 1024).toFixed(2);
      totalSize += bucketSize;

      console.log(`   Files: ${totalFiles}`);
      console.log(`   Size: ${sizeMB} MB\n`);
    }

    const totalMB = (totalSize / 1024 / 1024).toFixed(2);
    console.log(`\n📊 Total Storage: ${totalMB} MB`);

    // Check for old files that could be deleted
    console.log('\n🔍 Checking for old files (>30 days)...\n');

    for (const bucket of buckets) {
      const { data: oldFiles, error: oldFilesError } = await supabase.storage
        .from(bucket.name)
        .list('', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'asc' }
        });

      if (oldFilesError) {
        console.error(`   ❌ Error checking old files in ${bucket.name}: ${oldFilesError.message}`);
        continue;
      }

      if (oldFiles && oldFiles.length > 0) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const oldFilesList = oldFiles.filter(file => {
          if (!file.created_at) return false;
          const fileDate = new Date(file.created_at);
          return fileDate < thirtyDaysAgo;
        });

        if (oldFilesList.length > 0) {
          console.log(`   📁 ${bucket.name}: ${oldFilesList.length} files older than 30 days`);
          console.log(`      Oldest file: ${oldFilesList[0].created_at}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  checkStorageUsage()
    .then(() => {
      console.log('\n✅ Storage check complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

export { checkStorageUsage };

