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
      .pipe(csv({ headers: ['answer'] }))
      .on('data', data => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', error => {
        reject(error);
      });
  });
}


const analyzeSurveyAnswers = async () => {
  const surveyAnswers = await csvToArr('answers.csv')
  const batchSize = 50;
  
  for (let i = 0; i < surveyAnswers.length; i += batchSize) {
    const batch = surveyAnswers.slice(i, i + batchSize);
    try {
      const result = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          {
            "role": "system", 
            "content": `Your job is to analyze survey answers. For each answer, extract the sentiment (positive or negative only) as well as the theme in the answer.

              You must only respond with an array containing JSONs. These JSON objects must contain the keys "survey_answer", "sentiment", and "theme". 
              
              Here's an example of an valid answer: 
              \`\`\`
              [
                {
                  "survey_answer": "The product has potential, but it's not very intuitive to use. Please simplify the interface",
                  "sentiment": "negative",
                  "theme": "user interface",
                }
              ]
              \`\`\`
              `
          },
          {
            "role": "user", 
            "content": `Analyze these survey answer: ${JSON.stringify(batch.map(surveyAnswer => surveyAnswer.answer))}`
          }
        ],
      });

      const analyzedAnswers = JSON.parse(result.choices[0].message.content);
      analyzedAnswers.forEach(r => {
        const csvLine = `"${r.survey_answer}","${r.sentiment}","${r.theme}"\n`;
        fs.appendFile('analyzed_answers.csv', csvLine, (err) => {
          if (err) throw err;
          console.log('The analyzed answer was appended to file!');
        });
      });
    } catch (error) {
      console.log(`An error occurred: ${error}`)
    }
  }
}

analyzeSurveyAnswers()

