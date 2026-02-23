// Importación de librerías
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

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

// Función para actualizar una nota para un usuario
async function putNoteForUser(userId, noteId, noteText) {
  // Usar UpdateCommand para actualizar solo el campo text, manteniendo otros campos
  var params = {
    TableName: tableName,
    Key: {
      userId: userId,
      noteId: noteId,
    },
    UpdateExpression: "SET #text = :text",
    ExpressionAttributeNames: {
      "#text": "text",
    },
    ExpressionAttributeValues: {
      ":text": noteText,
    },
    ReturnValues: "ALL_NEW",
  };

  const data = await ddbDocClient.send(new UpdateCommand(params));
  return data.Attributes;
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

  // Generar URL prefirmada para descargar el audio durante 5 minutos (300 segundos)
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 300 });
  return signedUrl;
}

// Función para obtener una nota específica de un usuario
async function getNoteById(userId, noteId) {
  const params = {
    TableName: tableName,
    Key: {
      userId: userId,
      noteId: noteId,
    },
  };

  const data = await ddbDocClient.send(new GetCommand(params));
  return data.Item;
}

// Función para eliminar una nota específica de un usuario
async function deleteNoteById(userId, noteId) {
  const params = {
    TableName: tableName,
    Key: {
      userId: userId,
      noteId: noteId,
    },
  };

  const data = await ddbDocClient.send(new DeleteCommand(params));
  return data;
}

// Función para procesar una nota: sintetizar audio, traducir y actualizar
async function processNote(userId, noteId) {
  // Obtener la nota de la base de datos
  const note = await getNoteById(userId, noteId);
  if (!note) {
    throw new Error("Nota no encontrada");
  }

  const text = note.text;

  // Sintetizar audio con Polly
  const mp3Buffer = await textToSpeech(text);

  // Generar clave única para S3 (ej: userId-noteId-timestamp.mp3)
  const key = `${userId}-${noteId}-${Date.now()}.mp3`;

  // Subir a S3 y obtener URL prefirmada
  const signedUrl = await uploadToS3(mp3Buffer, key);

  // Traducir el texto al inglés
  const translateClient = new TranslateClient();
  const translateCommand = new TranslateTextCommand({
    Text: text,
    SourceLanguageCode: "auto", // Detectar automáticamente
    TargetLanguageCode: "en",
  });
  const translateResponse = await translateClient.send(translateCommand);
  const translation = translateResponse.TranslatedText;

  // Actualizar la nota en DynamoDB con la traducción
  const updateParams = {
    TableName: tableName,
    Key: {
      userId: userId,
      noteId: noteId,
    },
    UpdateExpression: "SET #translation = :translation",
    ExpressionAttributeNames: {
      "#translation": "translation",
    },
    ExpressionAttributeValues: {
      ":translation": translation,
    },
    ReturnValues: "ALL_NEW",
  };
  await ddbDocClient.send(new UpdateCommand(updateParams));

  return {
    audioUrl: signedUrl,
    translation: translation,
    noteId: noteId,
    userId: userId,
  };
}

// TODO: Exportar las funciones creadas
export { getNotesByUser, postNoteForUser, putNoteForUser, textToSpeech, uploadToS3, getNoteById, deleteNoteById, processNote };
