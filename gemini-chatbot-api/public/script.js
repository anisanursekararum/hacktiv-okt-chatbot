const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// Store conversation history for multi-turn chat context
const conversationHistory = [];

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // 1. Append user's message to UI and clear input field
  appendMessage('user', userMessage);
  input.value = '';

  // 2. Add message to conversation history
  conversationHistory.push({ role: 'user', text: userMessage });

  // 3. Show temporary "Thinking..." message
  const thinkingMsg = appendMessage('bot', 'Thinking...');

  try {
    // 4. Send POST request to backend API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ conversation: conversationHistory })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Remove temporary "Thinking..." placeholder
    thinkingMsg.remove();

    // 5. Check response and render model's reply
    if (data && data.result) {
      appendMessage('bot', data.result);
      conversationHistory.push({ role: 'model', text: data.result });
    } else {
      appendMessage('bot', 'Sorry, no response received.');
    }
  } catch (error) {
    console.error('Error fetching chat response:', error);

    // Remove thinking message if it still exists
    if (thinkingMsg) {
      thinkingMsg.remove();
    }

    // 6. Display failure message
    appendMessage('bot', 'Failed to get response from server.');
  }
});

function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}
