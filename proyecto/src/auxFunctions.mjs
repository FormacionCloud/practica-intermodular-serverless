// src/auxFunctions.mjs

// -------------------- Importaciones --------------------
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

// -------------------- Clientes AWS --------------------
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const pollyClient = new PollyClient({ region: "us-east-1" });
const s3Client = new S3Client();
const translateClient = new TranslateClient({ region: "us-east-1" });
const tableName = process.env.APP_TABLE;
const bucketName = process.env.APP_BUCKET;

// -------------------- Funciones --------------------

// Obtener todas las notas de un usuario
async function getNotesByUser(userId) {
  const params = {
    TableName: tableName,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: { ":userId": userId },
  };
  
  const data = await ddbDocClient.send(new QueryCommand(params));
  return data.Items;
}

// Crear nueva nota
async function postNoteForUser(userId, noteId, title, content, timestamp) {
  const params = {
    TableName: tableName,
    Item: {
      userId: userId,
      noteId: noteId,
      title: title,
      content: content,
      timestamp: timestamp,
    },
  };
  await ddbDocClient.send(new PutCommand(params));
  return params.Item;
}

// Actualizar nota existente
async function updateNote(userId, noteId, timestamp, fields) {
  const params = {
    TableName: tableName,
    Key: {
      userId: userId,
      noteId: noteId,
    },
    UpdateExpression: "",
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {},
    ReturnValues: "ALL_NEW",
  };

  const updates = [];
  for (const key in fields) {
    updates.push(`#${key} = :${key}`);
    params.ExpressionAttributeNames[`#${key}`] = key;
    params.ExpressionAttributeValues[`:${key}`] = fields[key];
  }

  params.UpdateExpression = "SET " + updates.join(", ");
  const result = await ddbDocClient.send(new UpdateCommand(params));
  return result.Attributes;
}

// Borrar nota
async function deleteNote(userId, noteId, timestamp) {
  const params = {
    TableName: tableName,
    Key: {
      userId: userId,
      noteId: noteId,
    },
  };
  await ddbDocClient.send(new DeleteCommand(params));
  return { message: "Nota eliminada correctamente" };
}

// Convertir texto a audio con Polly
async function textToSpeech(text) {
  const command = new SynthesizeSpeechCommand({
    Text: text,
    OutputFormat: "mp3",
    VoiceId: "Lucia",
  });

  const response = await pollyClient.send(command);
  const audioStream = response.AudioStream;
  
  const chunks = [];
  for await (const chunk of audioStream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// Subir audio a S3 y devolver URL prefirmada
async function uploadToS3(mp3Data, key) {
  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: mp3Data,
    ContentType: "audio/mpeg",
  }));

  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
  return url;
}

// Traducir texto a otro idioma (fuente fija: español)
async function translateNote(text, targetLanguage) {
  const command = new TranslateTextCommand({
    Text: text,
    SourceLanguageCode: "es",
    TargetLanguageCode: targetLanguage,
  });
  const response = await translateClient.send(command);
  return response.TranslatedText;
}

// -------------------- Exportar todas las funciones --------------------
export {
  getNotesByUser,
  postNoteForUser,
  updateNote,
  deleteNote,
  textToSpeech,
  uploadToS3,
  translateNote,
};