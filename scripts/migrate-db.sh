#!/bin/bash

# Database Migration Script for Vistral MVP
# Usage: ./scripts/migrate-db.sh [dev|staging|prod]

set -e

ENVIRONMENT=${1:-dev}
MIGRATION_FILE="supabase/migrations/001_checklist_migrations.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "🚀 Migrating database for environment: $ENVIRONMENT"
echo "📄 Migration file: $MIGRATION_FILE"
echo ""

case $ENVIRONMENT in
    dev)
        echo "📝 Instructions for Development:"
        echo "1. Go to your Supabase project: vistral-dev"
        echo "2. Open SQL Editor → New Query"
        echo "3. Copy and paste the contents of $MIGRATION_FILE"
        echo "4. Click 'Run' to execute"
        echo ""
        echo "Or use Supabase CLI:"
        echo "  supabase link --project-ref your-dev-project-ref"
        echo "  supabase db push"
        ;;
    staging)
        echo "📝 Instructions for Staging:"
        echo "1. Go to your Supabase project: vistral-staging"
        echo "2. Open SQL Editor → New Query"
        echo "3. Copy and paste the contents of $MIGRATION_FILE"
        echo "4. Click 'Run' to execute"
        echo ""
        echo "⚠️  Make sure you have a backup before running migrations in staging!"
        ;;
    prod)
        echo "📝 Instructions for Production:"
        echo "1. ⚠️  CREATE A BACKUP FIRST!"
        echo "2. Go to your Supabase project: vistral-prod"
        echo "3. Open SQL Editor → New Query"
        echo "4. Copy and paste the contents of $MIGRATION_FILE"
        echo "5. Review the SQL carefully"
        echo "6. Click 'Run' to execute"
        echo ""
        echo "⚠️  WARNING: This will modify your production database!"
        echo "⚠️  Make sure you have tested in staging first!"
        ;;
    *)
        echo "❌ Error: Invalid environment. Use: dev, staging, or prod"
        exit 1
        ;;
esac

echo ""
echo "✅ Migration instructions displayed above"
echo "📄 Migration file location: $MIGRATION_FILE"

