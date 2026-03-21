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
  const params = {
    TableName: tableName,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: { ":userId": userId },
  };

  const data = await ddbDocClient.send(new QueryCommand(params));
  const items = data.Items || [];  
  const now = Date.now();
  const expirationThresholdMs = 5 * 60 * 1000;

  // Usamos Promise.all con map para procesar cada nota de forma independiente
  const processedItems = await Promise.all(items.map(async (item) => {
    
    // Si la nota no tiene audio procesado, la devolvemos tal cual
    if (!item.audioKey || !item.audioGeneratedAt) {
      return { ...item, hasAudio: false, audioUrl: null };
    }

    const generatedAt = Number(item.audioGeneratedAt);
    const timeElapsed = now - generatedAt;

    // --- LOGICA DE DECISIÓN ---
    
    if (timeElapsed < expirationThresholdMs) {
      // CASO A: NO HA CADUCADO -> Generamos la URL solo para esta
      try {
        const getCommand = new GetObjectCommand({
          Bucket: process.env.APP_S3,
          Key: item.audioKey,
        });
        const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 300 });
        
        return { 
          ...item, 
          audioUrl: url, 
          hasAudio: true 
        };
      } catch (err) {
        console.error("Error con S3:", err);
        return { ...item, audioUrl: "error", hasAudio: true };
      }
    } else {
      // CASO B: YA CADUCÓ -> No llamamos a S3, marcamos como expired directamente
      return { 
        ...item, 
        audioUrl: "expired", 
        hasAudio: true 
      };
    }
  }));

  return processedItems;
}

// Función para crear una nota para un usuario
async function postNoteForUser(userId, noteId, text) {
  // Parámetros de la petición de DynamoDB
  // Petición PUT indicando la clave primaria: partición + ordenación
  var params = {
    TableName: tableName,
    Item: { userId: userId, noteId: noteId, text: text },
  };

  // Petición a DynamoDB
  const data = await ddbDocClient.send(new PutCommand(params));
  return data;
}

async function getNoteByUser(userId, noteId) {
  const params = {
    TableName: tableName,
    KeyConditionExpression: "userId = :userId AND noteId = :noteId",
    ExpressionAttributeValues: {
      ":userId": userId,
      ":noteId": noteId,
    },
  };

  // 1. Consultar la nota en DynamoDB
  const data = await ddbDocClient.send(new QueryCommand(params));
  const items = data.Items;

  const now = Date.now();
  const expirationThresholdMs = 5 * 60 * 1000;

if (items && items.length > 0) {
    for (let item of items) {
      if (item.audioKey && item.audioGeneratedAt) {
        // que sea un numero
        const generatedAt = Number(item.audioGeneratedAt);
        const timeElapsed = now - generatedAt;

        // Log para depuración
        console.log(`Nota ${item.noteId}: Transcurrido ${timeElapsed}ms de ${expirationThresholdMs}ms`);

        if (timeElapsed >= 0 && timeElapsed < expirationThresholdMs) {
          // sin caducar
          const getCommand = new GetObjectCommand({
            Bucket: process.env.APP_S3,
            Key: item.audioKey,
          });
          item.audioUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 300 });
          item.hasAudio = true;
        } else {
          // caducado
          item.audioUrl = "expired";
          item.hasAudio = true;
        }
      }
    }
  }
  return items;
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

async function putNote(userId, noteId, text) {
  console.log("Edit params:", userId, noteId, text);
  const params = {
    TableName: tableName,
    Item: { userId, noteId, text },
  };
  await ddbDocClient.send(new PutCommand(params));
}

async function processNote(userId, noteId) {
  console.log("Processing note:", userId, noteId);
  
  const params = {
    TableName: tableName,
    KeyConditionExpression: "userId = :userId AND noteId = :noteId",
    ExpressionAttributeValues: {
      ":userId": userId,
      ":noteId": noteId,
    },
  };

  const data = await ddbDocClient.send(new QueryCommand(params));
  const items = data.Items;

  if (!items || items.length === 0) {
    throw new Error("Nota no encontrada");
  }

  const text = items[0].text;

  // 1. Traducir
  const translateCommand = new TranslateTextCommand({
    SourceLanguageCode: "es",
    TargetLanguageCode: "en",
    Text: text,
  });
  const translateRes = await translateClient.send(translateCommand);
  const translatedText = translateRes.TranslatedText;
  
  // 2. Generar audio con Polly
  const audioBuffer = await textToSpeech(translatedText);

  // 3. Subir a S3
  const audioKey = `${userId}/${noteId}.mp3`;
  const audioGeneratedAt = Date.now(); //Guardamos el momento que lo generamos para que caduque en la vista
  await uploadToS3(audioBuffer, audioKey);

  // 4. Generar URL prefirmada (5 min)
  const getCommand = new GetObjectCommand({
    Bucket: process.env.APP_S3,
    Key: audioKey,
  });
  const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 300 });
  // 5. Actualizar DynamoDB
  const updateCommand = new UpdateCommand({
    TableName: tableName,
    Key: { userId, noteId },
    UpdateExpression: "SET #translation = :t, #audioKey = :a, #audioAt = :at",
    ExpressionAttributeNames: {
      "#translation": "translation",
      "#audioKey": "audioKey",
      "#audioAt": "audioGeneratedAt",
    },
    ExpressionAttributeValues: {
      ":t": translatedText,
      ":a": audioKey,
      //":at": Number(audioGeneratedAt), // para que dure en el tiempo
      ":at": audioGeneratedAt,
    },
  });
  await ddbDocClient.send(updateCommand);

  // 7. Devolver URL
  return {
    noteId,
    text,
    translation: translatedText,
    audioUrl: signedUrl,
  };

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
