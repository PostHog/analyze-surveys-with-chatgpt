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
      .pipe(csv({ headers: ['answer'] })) // add your column names as needed
      .on('data', data => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', error => {
        reject(error);
      });
  });
}

const analyzeSurveyResponses = async () => {
  const responses = await csvToArr('responses.csv')
  const batchSize = 50;
  
  for (let i = 0; i < responses.length; i += batchSize) {
    const batch = responses.slice(i, i + batchSize);
    try {
      const result = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          {
            "role": "system", 
            "content": `Your job is to analyze survey responses. For each response, extract the sentiment (positive or negative only) as well as the theme in the response. 
              You must only respond with an array containing JSONs. These JSON objects must contain the keys "survey_response", "sentiment", and "theme". 
              
              Here's an example of an valid response: 
              \`\`\`
              [
                {
                  "survey_response": "The product has potential, but it's not very intuitive to use. Please simplify the interface",
                  "sentiment": "negative",
                  "theme": "intuitiveness",
                }
              ]
              \`\`\`
              `
          },
          {
            "role": "user", 
            "content": `Analyze these survey response: ${JSON.stringify(batch.map(response => response.answer))}`
          }
        ],
      });

      const analyzedResponses = JSON.parse(result.choices[0].message.content);
      analyzedResponses.forEach(r => {
        const csvLine = `"${r.survey_response}","${r.sentiment}","${r.theme}"\n`;
        fs.appendFile('analyzed_responses.csv', csvLine, (err) => {
          if (err) throw err;
          console.log('The analyzed response was appended to file!');
        });
      });
    } catch (error) {
      console.log(`An error occurred: ${error}`)
    }
  }
}

analyzeSurveyResponses()

