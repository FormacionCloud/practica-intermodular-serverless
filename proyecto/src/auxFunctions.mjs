// Importación de librerías
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

// TODO: importar librerías adicionales (Translate)
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const translateClient = new TranslateClient();
const s3Client = new S3Client();

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
    Item: { userId: userId, noteId: noteId, noteText: noteText },
  };

  // Petición a DynamoDB
  const data = await ddbDocClient.send(new PutCommand(params));
  return data;
}

async function getNoteByUser(userId, noteId) {
  // Parámetros de la petición de DynamoDB
  // Hacemos una query indicando una condición de igualdad en la clave de partición
  // Asumiendo que el esquema de la tabla haga referencia al userId como valor de la
  // clave de partición
  var params = {
    TableName: tableName,
    ExpressionAttributeValues: {
      ":userId": userId,
      ":noteId": noteId,
    },
    // KeyConditionExpression: "userId= :userId",
    KeyConditionExpression: "userId= :userId AND noteId = :noteId",
  };

  // Petición a DynamoDB
  const data = await ddbDocClient.send(new QueryCommand(params));
  return data.Items;
}

async function deleteNote(userId, noteId) {
  console.log("DELETE params:", userId, noteId);
  const params = {
    TableName: tableName,
    Key: {
      userId: userId,
      noteId: noteId,
    },
  };
  // Petición a DynamoDB
  await ddbDocClient.send(new DeleteCommand(params));
}

async function putNote(userId, noteId, noteText) {
  console.log("Edit params:", userId, noteId, noteText);
  const params = {
    TableName: tableName,
    Item: { userId, noteId, noteText },
  };
  await ddbDocClient.send(new PutCommand(params));
}

async function processNote(userId, noteId) {
  console.log("Processing note:", userId, noteId);

  // 1. Obtener la nota
  const items = await getNoteByUser(userId, noteId);

  if (!items || items.length === 0) {
    throw new Error("Nota no encontrada");
  }

  const noteText = items[0].noteText;

  // 2. Generar audio con Polly
  const mp3Buffer = await textToSpeech(noteText);

  // 3. Subir a S3
  const key = `${userId}/${noteId}.mp3`;
  const bucketName = process.env.APP_S3;

  await uploadToS3(mp3Buffer, key);

  // 4. Generar URL prefirmada (5 min)
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 300, // 5 minutos
  });
  console.info("Url del Mp3", signedUrl);

  // 5. Traducir texto
  const translateCmd = new TranslateTextCommand({
    Text: noteText,
    SourceLanguageCode: "es",
    TargetLanguageCode: "en",
  });

  const translateResponse = await translateClient.send(translateCmd);
  const translatedText = translateResponse.TranslatedText;

  // 6. Actualizar DynamoDB (añadir translation)
  await ddbDocClient.send(new UpdateCommand({
    TableName: tableName,
    Key: { userId, noteId },
    UpdateExpression: "SET #translation = :t",
    ExpressionAttributeNames: {
    "#translation": "translation",
    },
    ExpressionAttributeValues: {
      ":t": translatedText,
    },
  }));

  // 7. Devolver URL
  return signedUrl;
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
  return;
}



// TODO: Exportar las funciones creadas
export { getNotesByUser, postNoteForUser, textToSpeech, uploadToS3, getNoteByUser, deleteNote, putNote, processNote };
