// Importación de librerías
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");
const { PollyClient, SynthesizeSpeechCommand } = require("@aws-sdk/client-polly");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// TODO: importar librerías adicionales (Translate)

// Clientes para interactuar con la API de DynamoDB
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

// Obtener el nombre de la tabla de DynamoDB a partir de la variable de entorno
const tableName = process.env.APP_TABLE;

// Función para obtener las notas de un usuario
async function getNotesByUser(userId) {
  var params = {
    TableName: tableName,
    ExpressionAttributeValues: {
      ":userId": userId,
    },
    KeyConditionExpression: "userId= :userId",
  };

  const data = await ddbDocClient.send(new QueryCommand(params));
  return data.Items;
}

// Función para crear una nota para un usuario
async function postNoteForUser(userId, noteId, noteText) {
  var params = {
    TableName: tableName,
    Item: { userId: userId, noteId: noteId, text: noteText },
  };

  const data = await ddbDocClient.send(new PutCommand(params));
  return data;
}

// Función que recibe un texto de una nota y devuelve un buffer con los datos sintetizados por Polly
async function textToSpeech(text) {
  const pollyClient = new PollyClient();
  const command = new SynthesizeSpeechCommand({
    Text: text,
    OutputFormat: "mp3",
    VoiceId: "Lucia",
  });

  const response = await pollyClient.send(command);
  const audioStream = response.AudioStream;

  const chunks = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

// Función que recibe un buffer con los datos sintetizados por Polly y los almacena en el objeto con nombre "key" en S3
async function uploadToS3(mp3Data, key) {
  const s3Client = new S3Client();

  const bucketName = process.env.APP_S3;
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: mp3Data,
    ContentType: "audio/mpeg",
  });

  await s3Client.send(command);

  // TODO: modificar para devolver una URL prefirmada de S3 que permita descargar
  // el audio durante un tiempo limitado de 5 minutos
  return;
}

// TODO: Añadir el resto de funciones necesarias de lógica de negocio

module.exports = { getNotesByUser, postNoteForUser, textToSpeech, uploadToS3 };
