# Questions Directory

This directory contains individual JSON files for each Salesforce certification.

## Structure

Each certification file follows this format:

```json
{
  "certification": {
    "id": "certification-id",
    "name": "Certification Name",
    "passingScore": 70,
    "recommendedTime": 60,
    "recommendedQuestions": 105,
    "categories": [...],
    "questions": [...]
  }
}
```

## Current Certifications

- **jsdev1.json** - JavaScript Developer I (186 questions)
  - Recommended Time: 60 minutes
  - Recommended Questions: 105
  
- **pd1.json** - Salesforce Platform Developer I (0 questions)
  - Recommended Time: 105 minutes
  - Recommended Questions: 60

## Adding New Certifications

1. Create a new JSON file in this directory (e.g., `admin.json`)
2. Follow the structure above
3. Add the certification ID to the `certFiles` array in `app.js`:
   ```javascript
   const certFiles = ['jsdev1', 'admin']; // Add new cert ID here
   ```

## Field Descriptions

- **id**: Unique identifier for the certification
- **name**: Display name of the certification
- **passingScore**: Minimum percentage required to pass (default: 70)
- **recommendedTime**: Suggested time limit in minutes for the exam
- **recommendedQuestions**: Number of questions typically on the actual exam
- **categories**: Array of topic categories with descriptions
- **questions**: Array of all available practice questions
