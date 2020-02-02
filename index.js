const Alexa = require('ask-sdk');
const dbHelper = require('./dbHelper');
/* CONSTANTS */
const skillBuilder = Alexa.SkillBuilders.custom();
const speechConsCorrect = ['Booya', 'All righty', 'Bam', 'Bazinga', 'Bingo', 'Boom', 'Bravo', 'Cha Ching', 'Cheers', 'Dynomite', 'Hip hip hooray', 'Hurrah', 'Hurray', 'Huzzah', 'Oh dear.  Just kidding.  Hurray', 'Kaboom', 'Kaching', 'Wah wah', 'Phew','Righto', 'Way to go', 'Well done', 'Whee', 'Woo hoo', 'Yay', 'Wowza', 'Yowsa'];
const speechConsWrong = ['Argh', 'Aw man', 'Blarg', 'Blast', 'Boo', 'Bummer', 'Darn', "D'oh", 'Dun dun dun', 'Eek', 'Honk', 'Le sigh', 'Mamma mia', 'Oh boy', 'Oh dear', 'Oof', 'Ouch', 'Ruh roh', 'Shucks', 'Uh oh', 'Whoops a daisy', 'Oh snap','Yikes'];

const welcomeMessage = `Welcome to Amaze me, it seems that we are interacting for the first time. Let me quickly give you a brief, there are different levels in this game and to reach a certain level you need points.<break strength='strong'/> You can earn these points by correctly guessing the answers to my question. <break strength='strong'/>Do you want to start the game or want more briefing on the rules ?`;

const exitSkillMessage = `Thank you for playing Amaze me!  Let's play again soon!`;

const helpMessage = `I have a good collection of riddles and amazing fun filled question. You can say start the game or say I want more briefing on the rules. What would you like to do?`;

const rulesMessage = `The game will start from level 1 and will go upto level 15, <break strength='strong'/> to clear each level you need to collect points  <break strength='strong'/> by answering my questions. Say start, to start the game`;
const levelPoints = {
  1: 20,
  2: 40,
  3: 60,
  4: 100,
  5: 140,
  6: 180,
  7: 250,
  8: 300,
  9: 350,
  10: 400,
  11: 500,
  12: 700,
  13: 1000,
  14: 1500,
  15: 2100,
};

/* INTENT HANDLERS */
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === `LaunchRequest`;
  },
  async handle(handlerInput) {
    console.log("Inside LaunchRequestHandler - handle");
    try {
      let userResults = await dbHelper.AuthenticateUser(handlerInput.requestEnvelope.context.System.user.userId);
      if (userResults.status !== 200) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.level = 1;
        attributes.counter = 0;
        attributes.quizScore = 0;
        attributes.questionCounter = 0;
        attributes.isUserAuthenticated = true;
        //SAVE ATTRIBUTES
        handlerInput.attributesManager.setSessionAttributes(attributes);
        return handlerInput.responseBuilder
        .speak(welcomeMessage)
        .reprompt(helpMessage)
        .getResponse();
      } else {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.level = userResults.data[0].Level;
        attributes.counter = 0;
        attributes.quizScore = userResults.data[0].Points;
        attributes.questionCounter = userResults.data[0].QuestionCounter;
        //SAVE ATTRIBUTES
        handlerInput.attributesManager.setSessionAttributes(attributes);
        const welcomeBackMessage = `Hello there, <break strength="x-strong" />Welcome back!!<break strength="x-strong" />. You are at level ${userResults.data[0].Level} with <break strength="x-strong" /> ${userResults.data[0].Points} points. Would you like to start the game ?`;
        return handlerInput.responseBuilder
        .speak(welcomeBackMessage)
        .reprompt( helpMessage)
        .getResponse(); 
      } 
    } catch (error) {
      console.log(`LaunchRequestHandler error ${error}`);
      return handlerInput.responseBuilder
      .speak( welcomeMessage)
      .reprompt( helpMessage)
      .getResponse();
    }
  },
};

const QuizHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log("Inside QuizHandler");
    console.log(JSON.stringify(request));
    return request.type === "IntentRequest" && (request.intent.name === "gameIntent" || 
    request.intent.name === "nextQuestionIntent");
  },
  async handle(handlerInput) {
    console.log("Inside QuizHandler - handle");
    try {
      const attributes = handlerInput.attributesManager.getSessionAttributes();
      attributes.counter = 0;
      const response = handlerInput.responseBuilder;
      if (!attributes.isUserAuthenticated) {
        let userResults = await dbHelper.AuthenticateUser(handlerInput.requestEnvelope.context.System.user.userId);
        if (userResults.status !== 200) {
          attributes.level = 1;
          attributes.quizScore = 0;
          attributes.questionCounter = 0;
          //SAVE ATTRIBUTES
          handlerInput.attributesManager.setSessionAttributes(attributes);
        } else {
          attributes.level = userResults.data[0].Level;
          attributes.quizScore = userResults.data[0].Points;
          attributes.questionCounter = userResults.data[0].QuestionCounter;
          //SAVE ATTRIBUTES
          handlerInput.attributesManager.setSessionAttributes(attributes);
        } 
      }
      let data =  await dbHelper.getQuestions(attributes.level, attributes.questionCounter)
      console.log('data from db: ', data);
      const question = askQuestion(data, handlerInput);
      const speakOutput = `Ok, Here comes question number ${attributes.questionCounter+1}. ${question}`;
      const repromptOutput = question;
      return response.speak(speakOutput)
                      .reprompt(repromptOutput)
                      .getResponse(); 
    } catch (error) {
      console.log(`QuizHandler error, details: ${error}`);
      const speechText = "we cannot get your question right now. Try again!"
      return response
        .speak(speechText)
        .getResponse();
    }
  },
};

const QuizAnswerHandler = {
  canHandle(handlerInput) {
    console.log("Inside QuizAnswerHandler");
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest' &&
           request.intent.name === 'answerIntent';
  },
  async handle(handlerInput) {
    console.log("Inside QuizAnswerHandler - handle");
    try {
      const attributes = handlerInput.attributesManager.getSessionAttributes();
      const userID = handlerInput.requestEnvelope.context.System.user.userId;
      const response = handlerInput.responseBuilder;
      let speakOutput = ``;
      const item = attributes.quizItem;
      const userAnswer  = handlerInput.requestEnvelope.request.intent.slots.answer.value.toLowerCase();
      const answerRemark  = item.Remarks || "KUCH_BHI";
      const isCorrectAnswer = userAnswer.indexOf(item.Answer.toLowerCase());
      const isCorrectRemark = userAnswer.indexOf(answerRemark.toLowerCase());
      console.log(`userAnswer ${userAnswer}`);
      console.log(`isCorrect ${isCorrectAnswer}`);
      console.log(`isCorrectRemark ${isCorrectRemark}`);
      
      if (isCorrectAnswer !== -1 || isCorrectRemark !== -1) {
        speakOutput = getSpeechCon(true);
        speakOutput += `You are correct. `;
        attributes.quizScore += item.Points;
        attributes.questionCounter += attributes.counter;
        speakOutput += `The answer is ${item.Answer}, Plus ${item.Points} for you.<break strength="x-strong" />`;
        // todo: check level here
        if (attributes.quizScore >= levelPoints[attributes.level]) {
          speakOutput += `<break strength="x-strong" /><say-as interpret-as='interjection'> Congratulations! </say-as><break strength='strong'/>You have cleared level ${attributes.level++}<break strength="x-strong" />`;
          attributes.questionCounter = 0;
        }
        speakOutput += `Ready for your next question ? <break strength="x-strong" />`;
        console.log(`attributes: ${JSON.stringify(attributes)}`);
        await dbHelper.updateUserScore(userID, attributes.level, attributes.quizScore, attributes.questionCounter);
        handlerInput.attributesManager.setSessionAttributes(attributes);
        return response.speak(speakOutput)
                       .reprompt(`Say yes, if you are ready for your next question. Say stop or pause, if you want to close the game.`)
                       .getResponse();
      } else {
        speakOutput = getSpeechCon(false);
        speakOutput += `<break strength="x-strong" />${userAnswer} is not the correct answer. Please try again..!! <break strength="x-strong" /> <break strength="x-strong" /> ${item.Question}`;
        return response.speak(speakOutput)
                       .reprompt(item.Question)
                       .getResponse();
      } 
    } catch (error) {
      let speakOutput = getSpeechCon(false);
      console.log(`QuizAnswerHandler error: ${error}`);
      speakOutput += `<break strength="x-strong" /> I think <break strength="x-strong" /> you need some more time to think, see you after some time, bye bye..!!<break strength="x-strong" />`;
      return response.speak(speakOutput);
    }
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
      return (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
          && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent' || (Alexa.getIntentName(handlerInput.requestEnvelope) === 'rulesIntent')));
  },
  handle(handlerInput) {
      return handlerInput.responseBuilder
          .speak(rulesMessage)
          .reprompt(rulesMessage)
          .getResponse();
  }
};

const ExitHandler = {
  canHandle(handlerInput) {
    console.log("Inside ExitHandler");
    const request = handlerInput.requestEnvelope.request;

    return request.type === `IntentRequest` && (
              request.intent.name === 'AMAZON.StopIntent' ||
              request.intent.name === 'AMAZON.PauseIntent' ||
              request.intent.name === 'AMAZON.CancelIntent'
           );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(exitSkillMessage)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    console.log("Inside SessionEndedRequestHandler");
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    return handlerInput.responseBuilder.speak(exitSkillMessage)
                                       .getResponse();
  },
};

function getRandom(min, max) {
  return Math.floor((Math.random() * ((max - min) + 1)) + min);
}

function askQuestion(Indata, handlerInput) {
  console.log("I am in askQuestion()");
  //GET SESSION ATTRIBUTES
  const attributes = handlerInput.attributesManager.getSessionAttributes();
  const item = Indata[attributes.counter];
  //SET QUESTION DATA TO ATTRIBUTES
  attributes.quizItem = item;
  attributes.counter += 1;

  //SAVE ATTRIBUTES
  handlerInput.attributesManager.setSessionAttributes(attributes);
  const question = attributes.quizItem.Question;
  return question;
}

function getSpeechCon(type) {
  if (type) return `<say-as interpret-as='interjection'>${speechConsCorrect[getRandom(0, speechConsCorrect.length - 1)]}! </say-as><break strength='strong'/>`;
  return `<say-as interpret-as='interjection'>${speechConsWrong[getRandom(0, speechConsWrong.length - 1)]} </say-as><break strength='strong'/>`;
}

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
  canHandle(handlerInput) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  handle(handlerInput) {
      const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
      const speakOutput = `You just triggered ${intentName}`;

      return handlerInput.responseBuilder
          .speak(speakOutput)
          //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
          .getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    console.log("Inside ErrorHandler");
    return true;
  },
  handle(handlerInput, error) {
    console.log("Inside ErrorHandler - handle");
    console.log(`Error handled: ${JSON.stringify(error)}`);
    console.log(`Handler Input: ${JSON.stringify(handlerInput)}`);

    return handlerInput.responseBuilder
      .speak('<break strength="x-strong" /> I think <break strength="x-strong" /> you need some more time to think, see you after some time, bye bye..!!<break strength="x-strong" />').getResponse();
  },
};


/* LAMBDA SETUP */
exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    QuizHandler,
    QuizAnswerHandler,
    HelpIntentHandler,
    ExitHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
