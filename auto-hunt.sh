#!/bin/bash

INDUSTRIES=("מוסך" "מספרה" "שיפוצניק" "רואה חשבון" "קפה" "מסעדה" "עורך דין")
CITIES=("תל אביב" "ירושלים" "חיפה" "פתח תקווה" "ראשון לציון" "נתניה" "באר שבע")

# Pick random industry and city
INDUSTRY=${INDUSTRIES[$RANDOM % ${#INDUSTRIES[@]}]}
CITY=${CITIES[$RANDOM % ${#CITIES[@]}]}

echo "[$(date)] Hunting: $INDUSTRY in $CITY"
node /root/scout-find-lead.js "$INDUSTRY" "$CITY"
