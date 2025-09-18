#!/bin/bash

# JobPing Database Cleanup Scheduler
# 
# This script provides automated scheduling for database cleanup operations.
# It can be used with cron, systemd timers, or container orchestration.
#
# Usage:
#   ./schedule-cleanup.sh [--dry-run] [--force] [--max-age=90]
#   
# Environment Variables:
#   CLEANUP_MODE: "api" (default) or "script" 
#   CLEANUP_URL: API endpoint URL for cleanup
#   CLEANUP_SECRET: Authentication secret for API
#   ADMIN_API_KEY: Admin API key for authentication
#   CLEANUP_MAX_AGE_DAYS: Maximum age of jobs to delete (default: 90)
#   CLEANUP_DRY_RUN: Set to "true" for dry run mode
#   CLEANUP_FORCE: Set to "true" to override safety checks
#
# Cron Examples:
#   # Daily at 2 AM
#   0 2 * * * /path/to/schedule-cleanup.sh
#   
#   # Weekly on Sunday at 3 AM with dry run first
#   0 3 * * 0 /path/to/schedule-cleanup.sh --dry-run
#   5 3 * * 0 /path/to/schedule-cleanup.sh

set -euo pipefail

# Configuration with defaults
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${LOG_FILE:-$PROJECT_ROOT/logs/cleanup-$(date +%Y%m%d-%H%M%S).log}"
CLEANUP_MODE="${CLEANUP_MODE:-api}"
CLEANUP_URL="${CLEANUP_URL:-}"
CLEANUP_SECRET="${CLEANUP_SECRET:-}"
ADMIN_API_KEY="${ADMIN_API_KEY:-}"
CLEANUP_MAX_AGE_DAYS="${CLEANUP_MAX_AGE_DAYS:-90}"
CLEANUP_DRY_RUN="${CLEANUP_DRY_RUN:-false}"
CLEANUP_FORCE="${CLEANUP_FORCE:-false}"

# Parse command line arguments
DRY_RUN="false"
FORCE="false"
MAX_AGE="$CLEANUP_MAX_AGE_DAYS"

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --force)
            FORCE="true"
            shift
            ;;
        --max-age=*)
            MAX_AGE="${1#*=}"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--dry-run] [--force] [--max-age=DAYS]"
            echo ""
            echo "Options:"
            echo "  --dry-run         Run in dry-run mode (no actual deletions)"
            echo "  --force          Override safety checks"
            echo "  --max-age=DAYS   Maximum age of jobs to delete (default: 90)"
            echo "  --help, -h       Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  CLEANUP_MODE     'api' or 'script' (default: api)"
            echo "  CLEANUP_URL      API endpoint URL"
            echo "  CLEANUP_SECRET   Authentication secret"
            echo "  ADMIN_API_KEY    Admin API key"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Override with CLI arguments
CLEANUP_DRY_RUN="$DRY_RUN"
CLEANUP_FORCE="$FORCE"
CLEANUP_MAX_AGE_DAYS="$MAX_AGE"

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_success() { log "SUCCESS" "$@"; }

# Error handling
cleanup_on_exit() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Cleanup script failed with exit code $exit_code"
        
        # Send alert if configured
        if [[ -n "${ALERT_WEBHOOK:-}" ]]; then
            curl -s -X POST "$ALERT_WEBHOOK" \
                -H "Content-Type: application/json" \
                -d "{\"text\": \"JobPing cleanup failed with exit code $exit_code. Check logs: $LOG_FILE\"}" \
                || true
        fi
    fi
}

trap cleanup_on_exit EXIT

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Main execution
main() {
    log_info "Starting JobPing database cleanup"
    log_info "Mode: $CLEANUP_MODE, Dry Run: $CLEANUP_DRY_RUN, Force: $CLEANUP_FORCE, Max Age: ${CLEANUP_MAX_AGE_DAYS} days"

    # Pre-flight checks
    if [[ "$CLEANUP_MODE" == "api" ]]; then
        if [[ -z "$CLEANUP_URL" ]]; then
            log_error "CLEANUP_URL must be set for API mode"
            exit 1
        fi
        
        if [[ -z "$CLEANUP_SECRET" && -z "$ADMIN_API_KEY" ]]; then
            log_error "Either CLEANUP_SECRET or ADMIN_API_KEY must be set for API authentication"
            exit 1
        fi
        
        run_api_cleanup
    else
        run_script_cleanup
    fi

    log_success "Database cleanup completed successfully"
}

run_api_cleanup() {
    log_info "Running cleanup via API endpoint: $CLEANUP_URL"
    
    # Prepare request data
    local request_data=$(cat <<EOF
{
    "dryRun": $CLEANUP_DRY_RUN,
    "force": $CLEANUP_FORCE,
    "maxAge": $CLEANUP_MAX_AGE_DAYS
}
EOF
)
    
    # Prepare authentication headers
    local auth_headers=()
    if [[ -n "$CLEANUP_SECRET" ]]; then
        auth_headers+=("-H" "X-Cleanup-Secret: $CLEANUP_SECRET")
    fi
    if [[ -n "$ADMIN_API_KEY" ]]; then
        auth_headers+=("-H" "X-API-Key: $ADMIN_API_KEY")
    fi
    
    # Make API request
    local response_file=$(mktemp)
    local http_code
    
    http_code=$(curl -s -w "%{http_code}" -o "$response_file" \
        -X POST "$CLEANUP_URL" \
        -H "Content-Type: application/json" \
        "${auth_headers[@]}" \
        -d "$request_data")
    
    local response_body=$(cat "$response_file")
    rm -f "$response_file"
    
    log_info "API Response Code: $http_code"
    
    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
        log_success "API cleanup completed successfully"
        log_info "Response: $response_body"
        
        # Parse and log key metrics if response is JSON
        if command -v jq >/dev/null 2>&1; then
            local deleted_count=$(echo "$response_body" | jq -r '.data.metrics.actuallyDeleted // "N/A"')
            local total_jobs=$(echo "$response_body" | jq -r '.data.metrics.totalJobs // "N/A"')
            local duration=$(echo "$response_body" | jq -r '.data.duration // "N/A"')
            
            log_info "Cleanup Metrics - Deleted: $deleted_count, Total Jobs: $total_jobs, Duration: $duration"
        fi
    else
        log_error "API cleanup failed with HTTP $http_code"
        log_error "Response: $response_body"
        exit 1
    fi
}

run_script_cleanup() {
    log_info "Running cleanup via direct script execution"
    
    local script_path="$SCRIPT_DIR/cleanup-old-jobs.js"
    
    if [[ ! -f "$script_path" ]]; then
        log_error "Cleanup script not found: $script_path"
        exit 1
    fi
    
    # Set environment variables for the script
    export CLEANUP_DRY_RUN="$CLEANUP_DRY_RUN"
    export CLEANUP_MAX_AGE_DAYS="$CLEANUP_MAX_AGE_DAYS"
    export CLEANUP_FORCE="$CLEANUP_FORCE"
    
    # Execute the cleanup script
    cd "$PROJECT_ROOT"
    
    if command -v node >/dev/null 2>&1; then
        log_info "Executing: node $script_path"
        node "$script_path" 2>&1 | tee -a "$LOG_FILE"
    else
        log_error "Node.js not found. Cannot execute cleanup script."
        exit 1
    fi
}

# Health check function (can be called separately)
health_check() {
    if [[ "$CLEANUP_MODE" == "api" && -n "$CLEANUP_URL" ]]; then
        local health_url="${CLEANUP_URL%/cleanup-jobs}/cleanup-jobs"
        local auth_headers=()
        
        if [[ -n "$CLEANUP_SECRET" ]]; then
            auth_headers+=("-H" "X-Cleanup-Secret: $CLEANUP_SECRET")
        fi
        if [[ -n "$ADMIN_API_KEY" ]]; then
            auth_headers+=("-H" "X-API-Key: $ADMIN_API_KEY")
        fi
        
        local http_code
        http_code=$(curl -s -w "%{http_code}" -o /dev/null \
            -X GET "$health_url" \
            "${auth_headers[@]}")
        
        if [[ "$http_code" -eq 200 ]]; then
            log_success "Cleanup API health check passed"
            return 0
        else
            log_error "Cleanup API health check failed (HTTP $http_code)"
            return 1
        fi
    else
        log_info "Health check not applicable for script mode"
        return 0
    fi
}

# Handle special command for health check
if [[ "${1:-}" == "health-check" ]]; then
    health_check
    exit $?
fi

# Execute main function
main "$@"
