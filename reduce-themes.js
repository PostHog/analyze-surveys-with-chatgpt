const fs = require('fs');
const csv = require('csv-parser');
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: "your-api-key"
});

const csvToArr = async (filePath) => {
  const results = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ headers: ['answer', 'sentiment', 'theme'] }))
      .on('data', data => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', error => {
        reject(error);
      });
  });
}

const reduceThemes = async () => {
  const analyzedResponses = await csvToArr('analyzed_responses.csv')  
    try {
      const themes = new Set(analyzedResponses.map(response => response.theme))
      const result = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            "role": "system", 
            "content": `Your job is to aggregate this list of themes and group similar themes together. By grouping the themes together, you will reduce the number of themes in the list.
            In your response, you must list the old theme and the new theme are you aggregating it to. 
            
            You must only respond with a JSON object. This JSON objects must use the old themes as the keys, and the values must be the new themes. 
              
              Here's an example of an valid response: 
              \`\`\`
                {
                  "collaboration": "collaboration"
                  "collaboration tools": "collaboration",
                  "user permissions": "user permissions",
                  "user roles and permissions": "user permissions",
                  "integration": "integrations",
                  "integrations": "integrations",
                }
              \`\`\`
              `
          },
          {
            "role": "user", 
            "content": `Aggregate these themes: ${JSON.stringify(Array.from(themes))}`
          }
        ],
      });
      const newThemes = JSON.parse(result.choices[0].message.content);

      // update the previously analyzed responses with the new themes
      const updatedResponses = analyzedResponses.map(old => {
        const updatedResponse = old
        updatedResponse.theme = newThemes[old.theme]
        return updatedResponse
      })

      // overwrite the current contents of analyzed_responses.csv with the updated responses
      const lines = analyzedResponses.map(r => `"${r.answer}","${r.sentiment}","${r.theme}"`).join('\n');
      fs.writeFile('analyzed_responses.csv', lines, (err) => {
        if (err) throw err;
        console.log('All analyzed responses were written to file!');
      });

    } catch (error) {
      console.log(`An error occurred: ${error}`)
    }
}

reduceThemes()

