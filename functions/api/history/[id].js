/**
 * Handles GET requests to fetch a specific conversation by its ID.
 */
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const conversationId = params.id; // Get 'id' from the path

  try {
    // TODO: Implement logic to fetch the specific conversation details from your storage (KV, D1, etc.)
    // using `conversationId`.
    // The frontend expects an object like:
    // {
    //   id: conversationId,
    //   scenario: "general", // The scenario of the conversation
    //   messages: [
    //     { text: "User message", sender: "user", type: "text" },
    //     { text: "AI reply", sender: "ai", type: "text" },
    //     // ... more messages
    //   ]
    // }

    // Placeholder response
    if (conversationId === "sample1" || conversationId === "sample2") {
      const placeholderConversation = {
        id: conversationId,
        scenario: conversationId === "sample1" ? "general" : "code",
        messages: [
          { text: `Hello from ${conversationId}`, sender: "user", type: "text" },
          { text: `This is a placeholder for conversation ${conversationId} from Function.`, sender: "ai", type: "text" },
        ],
      };
      return new Response(JSON.stringify(placeholderConversation), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Conversation not found (placeholder)' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error(`Error fetching conversation ${conversationId}:`, error);
    return new Response(JSON.stringify({ error: error.message || `Failed to fetch conversation ${conversationId}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handles DELETE requests to delete a specific conversation by its ID.
 */
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const conversationId = params.id;

  try {
    // TODO: Implement logic to delete the specific conversation from your storage (KV, D1, etc.)
    // using `conversationId`.

    console.log(`Deleting conversation ${conversationId} (placeholder)`);

    return new Response(JSON.stringify({ message: `Conversation ${conversationId} deleted successfully (placeholder)` }), {
      status: 200, // or 204 No Content
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`Error deleting conversation ${conversationId}:`, error);
    return new Response(JSON.stringify({ error: error.message || `Failed to delete conversation ${conversationId}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 