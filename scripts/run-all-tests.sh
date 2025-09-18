#!/bin/bash

# JobPing Test Runner
# Runs all test suites with proper configuration

set -e

echo "🧪 Starting JobPing Test Suite"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
COVERAGE_THRESHOLD=75
TIMEOUT=30000

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Set test environment
export NODE_ENV=test
export MATCH_USERS_DISABLE_AI=true
export BYPASS_RESERVATION=1

print_status "Environment: $NODE_ENV"
print_status "AI Matching: Disabled"
print_status "Reservation Bypass: Enabled"

# Run different test suites
run_unit_tests() {
    print_status "Running Unit Tests..."
    npm test -- --testPathPattern=unit --coverage --coverageReporters=text --coverageReporters=html
}

run_integration_tests() {
    print_status "Running Integration Tests..."
    npm test -- --testPathPattern=integration --coverage --coverageReporters=text
}

run_performance_tests() {
    print_status "Running Performance Tests..."
    npm test -- --testPathPattern=performance --testTimeout=60000
}

run_api_tests() {
    print_status "Running API Tests..."
    npm test -- --testPathPattern=api --coverage --coverageReporters=text
}

run_all_tests() {
    print_status "Running All Tests..."
    npm test -- --coverage --coverageReporters=text --coverageReporters=html --testTimeout=$TIMEOUT
}

# Parse command line arguments
case "${1:-all}" in
    "unit")
        run_unit_tests
        ;;
    "integration")
        run_integration_tests
        ;;
    "performance")
        run_performance_tests
        ;;
    "api")
        run_api_tests
        ;;
    "all")
        run_all_tests
        ;;
    "quick")
        print_status "Running Quick Tests (no coverage)..."
        npm test -- --testPathPattern="unit|integration" --testTimeout=15000
        ;;
    "ci")
        print_status "Running CI Tests..."
        npm test -- --coverage --coverageReporters=text --coverageReporters=lcov --testTimeout=$TIMEOUT --ci --watchAll=false
        ;;
    *)
        echo "Usage: $0 [unit|integration|performance|api|all|quick|ci]"
        echo ""
        echo "Test suites:"
        echo "  unit        - Unit tests only"
        echo "  integration - Integration tests only"
        echo "  performance - Performance tests only"
        echo "  api         - API tests only"
        echo "  all         - All tests (default)"
        echo "  quick       - Quick tests without coverage"
        echo "  ci          - CI-optimized tests"
        exit 1
        ;;
esac

# Check test results
if [ $? -eq 0 ]; then
    print_success "All tests passed! ✅"
    
    # Check coverage if coverage was generated
    if [ -f "coverage/coverage-summary.txt" ]; then
        COVERAGE=$(grep -o 'All files[^0-9]*[0-9]*\.[0-9]*' coverage/coverage-summary.txt | grep -o '[0-9]*\.[0-9]*$')
        if [ ! -z "$COVERAGE" ]; then
            COVERAGE_INT=$(echo $COVERAGE | cut -d. -f1)
            if [ $COVERAGE_INT -ge $COVERAGE_THRESHOLD ]; then
                print_success "Coverage: ${COVERAGE}% (meets threshold of ${COVERAGE_THRESHOLD}%)"
            else
                print_warning "Coverage: ${COVERAGE}% (below threshold of ${COVERAGE_THRESHOLD}%)"
            fi
        fi
    fi
    
    echo ""
    print_success "Test suite completed successfully!"
    echo "📊 Coverage report: coverage/index.html"
    echo "📈 Test results: Check console output above"
    
else
    print_error "Some tests failed! ❌"
    echo ""
    print_error "Please check the test output above for details."
    echo "💡 Tips:"
    echo "   - Run 'npm test -- --verbose' for detailed output"
    echo "   - Run 'npm test -- --testNamePattern=<test-name>' for specific tests"
    echo "   - Check jest.setup.ts for test configuration"
    exit 1
fi