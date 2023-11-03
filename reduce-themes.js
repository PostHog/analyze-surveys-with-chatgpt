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
  const analyzedAnswers = await csvToArr('analyzed_answers.csv')  
    try {
      const themes = new Set(analyzedAnswers.map(answer => answer.theme))
      const result = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          {
            "role": "system", 
            "content": `Your job is to aggregate this list of themes and group similar themes together. By grouping the themes together, you will reduce the number of themes in the list.
            In your answer, you must list the old theme and the new theme are you aggregating it to. 
            
            You must only respond with a JSON object. This JSON objects must use the old themes as the keys, and the values must be the new themes. 
              
              Here's an example of an valid answer: 
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

      // update the previously analyzed answers with the new themes
      const updatedAnswers = analyzedAnswers.map(old => {
        const updatedAnswer = old
        updatedAnswer.theme = newThemes[old.theme]
        return updatedAnswer
      })

      // overwrite the current contents of analyzed_answers.csv with the updated answers
      const lines = analyzedAnswers.map(r => `"${r.answer}","${r.sentiment}","${r.theme}"`).join('\n');
      fs.writeFile('analyzed_answers.csv', lines, (err) => {
        if (err) throw err;
        console.log('All analyzed answers were written to file!');
      });

    } catch (error) {
      console.log(`An error occurred: ${error}`)
    }
}

reduceThemes()