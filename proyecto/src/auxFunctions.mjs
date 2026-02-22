// Importación de librerías
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// TODO: importar librerías adicionales (Translate)

import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DeleteCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Clientes para interactuar con la API de DynamoDB
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

// Obtener el nombre de la tabla de DynamoDB a partir de la variable de entorno
const tableName = process.env.APP_TABLE;

// Función para obtener las notas de un usuario
async function getNotesByUser(userId) {
  // Parámetros de la petición de DynamoDB
  // Hacemos una query indicando una condición de igualdad en la clave de partición
  // Asumiendo que el esquema de la tabla haga referencia al userId como valor de la
  // clave de partición
  var params = {
    TableName: tableName,
    ExpressionAttributeValues: {
      ":userId": userId,
    },
    KeyConditionExpression: "userId= :userId",
  };

  // Petición a DynamoDB
  const data = await ddbDocClient.send(new QueryCommand(params));
  return data.Items;
}

// Función para crear una nota para un usuario
async function postNoteForUser(userId, noteId, noteText) {
  // Parámetros de la petición de DynamoDB
  // Petición PUT indicando la clave primaria: partición + ordenación
  var params = {
    TableName: tableName,
    Item: { userId: userId, noteId: noteId, text: noteText },
  };

  // Petición a DynamoDB
  const data = await ddbDocClient.send(new PutCommand(params));
  return data;
}

// Función que recibe un texto de una nota y devuelve un buffer con los datos sintetizados por Polly
async function textToSpeech(text) {
  const pollyClient = new PollyClient();
  const command = new SynthesizeSpeechCommand({
    Text: text,
    OutputFormat: "mp3",
    VoiceId: "Lucia", // Puedes cambiar este valor si lo deseas. Consulta la doc de Polly
  });

  const response = await pollyClient.send(command);
  const audioStream = response.AudioStream;

  // Convertir a buffer
  const chunks = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

// Función que recibe un buffer con los datos sintetizados por Polly y los almacena en el objeto con nombre "key" en S3
async function uploadToS3(mp3Data, key) {
  const s3Client = new S3Client();

  // Obtener el nombre del bucket S3 a partir de la variable de entorno
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
  // Función que recibe un buffer con los datos sintetizados por Polly y los almacena en S3
// Devuelve una URL prefirmada válida durante 5 minutos
async function uploadToS3(mp3Data, key) {
  const s3Client = new S3Client();

  const bucketName = process.env.APP_S3;

  // Subimos el archivo
  const putCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: mp3Data,
    ContentType: "audio/mpeg",
  });

  await s3Client.send(putCommand);

  // Generamos URL prefirmada válida 5 minutos (300 segundos)
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3Client, getCommand, {
    expiresIn: 300, // 5 minutos
  });

  return signedUrl;
}
  return;
}

// TODO: Añadir el resto de funciones necesarias de lógica de negocio

// Función para borrar UNA nota concreta de un usuario
async function deleteNote(userId, noteId) {

  const params = {
    TableName: tableName,
    Key: {
      userId: userId,
      noteId: noteId,
    },
  };

  await ddbDocClient.send(new DeleteCommand(params));

  return {
    message: `Nota ${noteId} eliminada correctamente`,
  };
}

// Función para obtener UNA nota concreta de un usuario
async function getNote(userId, noteId) {

  const params = {
    TableName: tableName,
    Key: {
      userId: userId,
      noteId: noteId,
    },
  };

  const data = await ddbDocClient.send(new GetCommand(params));

  if (!data.Item) {
    throw new Error("Nota no encontrada");
  }

  return data.Item;
}

// Función para actualizar una nota específica de un usuario
async function putNote(userId, noteId, noteText) {

  const params = {
    TableName: tableName,
    Item: {
      userId: userId,
      noteId: noteId,
      text: noteText,
    },
  };

  await ddbDocClient.send(new PutCommand(params));

  return {
    message: `Nota ${noteId} actualizada correctamente`,
  };
}

// Función para crear una nueva nota para un usuario
async function postNote(userId, noteId, noteText) {

  const params = {
    TableName: tableName,
    Item: {
      userId: userId,
      noteId: noteId,
      text: noteText,
    },
  };

  await ddbDocClient.send(new PutCommand(params));

  return {
    message: `Nota ${noteId} creada correctamente`,
  };
}

// Función para procesar una nota: generar MP3, traducir y actualizar la nota
async function processNote(userId, noteId) {
  // 1️⃣ Obtener la nota de la base de datos
  const getCmd = new GetCommand({
    TableName: tableName,
    Key: { userId, noteId },
  });
  const data = await ddbDocClient.send(getCmd);

  if (!data.Item) {
    throw new Error("Nota no encontrada");
  }

  const text = data.Item.text;

  // 2️⃣ Enviar el texto a Polly para generar MP3
  const pollyCmd = new SynthesizeSpeechCommand({
    Text: text,
    OutputFormat: "mp3",
    VoiceId: "Lucia",
  });
  const pollyResp = await pollyClient.send(pollyCmd);

  // Convertir AudioStream a Buffer
  const chunks = [];
  for await (const chunk of pollyResp.AudioStream) {
    chunks.push(chunk);
  }
  const audioBuffer = Buffer.concat(chunks);

  // 3️⃣ Guardar MP3 en S3
  const key = `${userId}/${noteId}.mp3`;
  const putCmd = new PutObjectCommand({
    Bucket: process.env.APP_S3,
    Key: key,
    Body: audioBuffer,
    ContentType: "audio/mpeg",
  });
  await s3Client.send(putCmd);

  // 4️⃣ Generar URL prefirmada válida 5 minutos
  const getObjectCmd = new GetObjectCommand({
    Bucket: process.env.APP_S3,
    Key: key,
  });
  const signedUrl = await getSignedUrl(s3Client, getObjectCmd, { expiresIn: 300 });

  // 5️⃣ Traducir el texto al inglés con Translate
  const translateCmd = new TranslateTextCommand({
    Text: text,
    SourceLanguageCode: "auto",
    TargetLanguageCode: "en",
  });
  const translateResp = await translateClient.send(translateCmd);
  const translation = translateResp.TranslatedText;

  // 6️⃣ Actualizar la nota en DynamoDB con el campo translation
  const updateCmd = new UpdateCommand({
    TableName: tableName,
    Key: { userId, noteId },
    UpdateExpression: "SET translation = :t",
    ExpressionAttributeValues: { ":t": translation },
  });
  await ddbDocClient.send(updateCmd);

  // 7️⃣ Devolver URL prefirmada
  return signedUrl;
}

// TODO: Exportar las funciones creadas
export { getNotesByUser, postNoteForUser, textToSpeech, uploadToS3, putNote, getNote, deleteNote,postNote, processNote };
