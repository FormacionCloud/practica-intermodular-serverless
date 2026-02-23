// Importación de librerías
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// TODO: importar librerías adicionales (Translate)
import {
  TranslateClient,
  TranslateTextCommand,
} from "@aws-sdk/client-translate";

// Clientes para interactuar con la API de DynamoDB
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const translateClient = new TranslateClient();
const s3Client = new S3Client({ region: process.env.AWS_REGION });

// Obtener el nombre de la tabla de DynamoDB a partir de la variable de entorno
const tableName = process.env.APP_TABLE;
if (!tableName) {
  throw new Error("APP_TABLE no está definida");
}
// Función para obtener las notas de un usuario
async function getNotesByUser(userId) {
  // Parámetros de la petición de DynamoDB
  // Hacemos una query indicando una condición de igualdad en la clave de partición
  // Asumiendo que el esquema de la tabla haga referencia al userId como valor de la
  // clave de partición
  let params = {
    TableName: tableName,
    ExpressionAttributeValues: {
      ":userId": userId,
    },
    KeyConditionExpression: "userId= :userId",
  };

  // Petición a DynamoDB
  const data = await ddbDocClient.send(new QueryCommand(params));
  console.log("Data obtenida:", data);
  return data.Items;
}

// Función para crear una nota para un usuario
async function postNoteForUser(userId, noteId, noteText) {
  // Parámetros de la petición de DynamoDB
  // Petición PUT indicando la clave primaria: partición + ordenación
  let params = {
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
  // Obtener el nombre del bucket S3 a partir de la variable de entorno
  const bucketName = process.env.APP_S3;
  if (!bucketName) {
    throw new Error("El bucket de S3 no está definido");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: mp3Data,
    ContentType: "audio/mpeg",
  });

  await s3Client.send(command);

  // TODO: modificar para devolver una URL prefirmada de S3 que permita descargar
  // el audio durante un tiempo limitado de 5 minutos
  let command_get_url = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  let url = await getSignedUrl(s3Client, command_get_url, { expiresIn: 300 });

  return url;
}

// TODO: Añadir el resto de funciones necesarias de lógica de negocio

/*** Función para obtener una nota de un usuario por id ****/
async function getNoteById(userId, noteId) {
  let params = {
    TableName: tableName,
    Key: { userId, noteId },
  };

  // Petición a DynamoDB
  const data = await ddbDocClient.send(new GetCommand(params));
  return data.Item || null;
}

/*** Función para eliminar una nota para un usuario ***/
async function deleteNoteForUser(userId, noteId) {
  // Parámetros de la petición de DynamoDB
  let params = {
    TableName: tableName,
    Key: { userId: userId, noteId: noteId },
  };

  // Petición a DynamoDB
  var data = await ddbDocClient.send(new DeleteCommand(params));
  return data;
}

// Función para crear un nota para un usuario
async function addAttributeToNote(
  userId,
  noteId,
  attributeName,
  attributeContent,
) {
  const params = {
    TableName: tableName,
    Key: { userId, noteId },
    UpdateExpression: `SET #attr = :value`,
    ExpressionAttributeNames: { "#attr": attributeName },
    ExpressionAttributeValues: { ":value": attributeContent },
  };
  return await ddbDocClient.send(new UpdateCommand(params));
}


/*** Función para procesar una nota, genera su traducción, la alacena y genera un audio con el texto original ****/
async function processNote(userId, noteId) {

  const data = await ddbDocClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { userId, noteId },
    }),
  );

  if (!data.Item) {
    throw new Error("Nota no encontrada");
  }

  const note = data.Item;
  const noteText = note.text;

  const params = {
    Text: noteText,
    SourceLanguageCode: "auto",
    TargetLanguageCode: "en",
  };

  const command = new TranslateTextCommand(params);
  const response = await translateClient.send(command);
  const translated_text = response.TranslatedText;

  try {
    await addAttributeToNote(userId, noteId, "translation", translated_text);
  } catch (error) {
    console.log("Error actualizando la nota", error);
    throw new Error("Ha ocurrido un error al actualizar la nota");
  }

  let buffer_audio = await textToSpeech(noteText);

  let iso = new Date().toISOString();
  
  //Ejemplo de nombre de archivo esperado 2026-02-19T191300123.mp3
  let filename = iso.replace(/[:.]/g, "").replace("Z", "") + ".mp3";

  let s3_key = userId + "/" + noteId + "/" + filename;

  try {
    let signedUrl = await uploadToS3(buffer_audio, s3_key);
    return {
      url: signedUrl,
    };
  } catch (error) {
    console.log("Error al subir el audio a S3", error);
    throw new Error("Error al subir el audio a S3");
  }
}

// TODO: Exportar las funciones creadas
export {
  getNotesByUser,
  postNoteForUser,
  textToSpeech,
  uploadToS3,
  getNoteById,
  deleteNoteForUser,
  processNote,
};
