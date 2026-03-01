// test-lambda.js
// Ejecuta pruebas locales de las lambdas: getNote, putNote, deleteNote, processNote

// Importamos cada lambda desde src/handlers
import { handler as getNoteHandler } from "./src/handlers/getNote.mjs";
import { handler as putNoteHandler } from "./src/handlers/putNote.mjs";
import { handler as deleteNoteHandler } from "./src/handlers/deleteNote.mjs";
import { handler as processNoteHandler } from "./src/handlers/processNote.mjs";

// Función auxiliar para ejecutar la lambda y mostrar el resultado
async function runTest(lambdaFunc, event) {
  try {
    const result = await lambdaFunc(event);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.log("Error en la prueba:", err);
  }
}

// Eventos simulados para cada lambda
const getNoteEvent = {
  httpMethod: "GET",
  path: "/notes/nota123",
  pathParameters: { noteId: "nota123" },
  requestContext: { authorizer: { claims: {} } },
  body: null,
};

const putNoteEvent = {
  httpMethod: "PUT",
  path: "/notes/nota123",
  pathParameters: {},
  requestContext: { authorizer: { claims: {} } },
  body: JSON.stringify({
    noteId: "nota123",
    title: "Nueva nota",
    content: "Contenido actualizado",
    timestamp: Date.now(),
  }),
};

const deleteNoteEvent = {
  httpMethod: "DELETE",
  path: "/notes/nota123",
  pathParameters: {},
  requestContext: { authorizer: { claims: {} } },
  body: JSON.stringify({
    noteId: "nota123",
    timestamp: Date.now(),
  }),
};

const processNoteEvent = {
  httpMethod: "POST",
  path: "/notes/nota123/process",
  pathParameters: {},
  requestContext: { authorizer: { claims: {} } },
  body: JSON.stringify({ noteId: "nota123" }),
};

// Ejecutamos todas las pruebas
(async () => {
  console.log("===== getNote =====");
  await runTest(getNoteHandler, getNoteEvent);

  console.log("\n===== putNote =====");
  await runTest(putNoteHandler, putNoteEvent);

  console.log("\n===== deleteNote =====");
  await runTest(deleteNoteHandler, deleteNoteEvent);

  console.log("\n===== processNote =====");
  await runTest(processNoteHandler, processNoteEvent);
})();