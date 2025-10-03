#!/bin/bash
# migrate-controller.sh - Helper script to migrate a controller to enhanced logging

CONTROLLER_FILE=$1
BACKUP_FILE="${CONTROLLER_FILE}.backup"

if [ -z "$CONTROLLER_FILE" ]; then
    echo "Usage: $0 <controller-file>"
    exit 1
fi

echo "Migrating controller: $CONTROLLER_FILE"

# Replace console.error with req.logger.error
sed -i 's/console\.error(/req.logger.error(/g' "$CONTROLLER_FILE"

# Replace console.log with req.logger.info
sed -i 's/console\.log(/req.logger.info(/g' "$CONTROLLER_FILE"

# Replace async method(req: Request with method = this.asyncHandler(async (req: RequestWithLogging
sed -i -E 's/async ([a-zA-Z]+)\(req: Request, res: Response\) \{/\1 = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {/g' "$CONTROLLER_FILE"

# Count remaining issues
echo "Migration complete. Remaining manual fixes needed:"
grep -n "res.json(result)" "$CONTROLLER_FILE" | wc -l
echo "res.json(result) calls to convert to this.sendSuccess()"

grep -n "res.status(" "$CONTROLLER_FILE" | wc -l  
echo "res.status() calls to review"

echo "Remember to:"
echo "1. Add audit logging for CREATE/UPDATE/DELETE operations"
echo "2. Add business operation logging"
echo "3. Replace res.json() with this.sendSuccess() or this.sendPaginatedResponse()"
echo "4. Fix closing braces from } to })"