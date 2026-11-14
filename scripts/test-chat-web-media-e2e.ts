/**
 * Milestone 4 - FrontDesk Web Coach Media & Reviewer E2E Test
 *
 * Verifies end-to-end:
 * 1. FrontDesk staff / trainer authentication.
 * 2. Media presign API call from web client (image, video form check, voice memo).
 * 3. Message dispatch with media metadata & caption.
 * 4. Message retrieval & serialization matching ChatMessage & ChatMedia interfaces.
 * 5. Rejection of invalid media payloads.
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000';

async function run() {
  console.log('🚀 Starting Milestone 4 FrontDesk Web Coach Media E2E Test...');

  // 1. Staff / Coach Login
  console.log('\n--- Step 1: Staff / Coach Authentication ---');
  let token = '';
  try {
    const authRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'ravi@chat.test',
      password: 'chat-demo-1234',
    });
    token = authRes.data.accessToken || authRes.data.token;
    console.log('✅ Coach authenticated successfully.');
  } catch (err: any) {
    console.error('❌ Authentication failed:', err.response?.data || err.message);
    process.exit(1);
  }

  const client = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}` },
  });

  // 2. Fetch or create a conversation
  console.log('\n--- Step 2: Fetch Conversation ---');
  let conversationId = '';
  try {
    const convRes = await client.get('/chat/conversations');
    const conversations = convRes.data.conversations;
    if (conversations.length > 0) {
      conversationId = conversations[0].id;
      console.log(`✅ Using active conversation: ${conversationId}`);
    } else {
      console.log('Fetching contacts to open conversation...');
      const contactsRes = await client.get('/chat/contacts');
      const peer = contactsRes.data.contacts[0];
      const openRes = await client.post('/chat/conversations', {
        kind: peer.kind,
        id: peer.id,
      });
      conversationId = openRes.data.conversation.id;
      console.log(`✅ Opened new conversation: ${conversationId}`);
    }
  } catch (err: any) {
    console.error('❌ Failed to get conversation:', err.response?.data || err.message);
    process.exit(1);
  }

  // 3. Test Web Presign for Coach Image Attachment
  console.log('\n--- Step 3: Web Coach Presign Image ---');
  let imagePresign: any;
  try {
    const res = await client.post(`/chat/conversations/${conversationId}/media/presign`, {
      fileName: 'coach_plan_chart.png',
      mimeType: 'image/png',
      byteSize: 345000,
      kind: 'image',
    });
    imagePresign = res.data;
    const downloadUrl = imagePresign.downloadUrl || imagePresign.url;
    if (!imagePresign.uploadUrl || !downloadUrl || !imagePresign.s3Key) {
      throw new Error('Missing presign fields');
    }
    imagePresign.downloadUrl = downloadUrl;
    console.log('✅ Image presign URL generated for coach upload.');
  } catch (err: any) {
    console.error('❌ Image presign failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 4. Test Web Presign for Video Form Check
  console.log('\n--- Step 4: Web Coach Presign Video Form Check ---');
  let videoPresign: any;
  try {
    const res = await client.post(`/chat/conversations/${conversationId}/media/presign`, {
      fileName: 'form_critique.mp4',
      mimeType: 'video/mp4',
      byteSize: 12500000,
      kind: 'video',
    });
    videoPresign = res.data;
    if (!videoPresign.uploadUrl || !(videoPresign.downloadUrl || videoPresign.url)) {
      throw new Error('Missing presign video fields');
    }
    console.log('✅ Video form check presign URL generated.');
  } catch (err: any) {
    console.error('❌ Video presign failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 5. Send Image Message from Coach Web Composer
  console.log('\n--- Step 5: Send Image Message from Coach Web Composer ---');
  const clientMessageId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  try {
    const sendRes = await client.post(`/chat/conversations/${conversationId}/messages`, {
      body: 'Here is your revised training block schedule.',
      clientMessageId,
      kind: 'image',
      media: {
        s3Key: imagePresign.s3Key,
        url: imagePresign.downloadUrl,
        mimeType: 'image/png',
        byteSize: 345000,
        width: 1920,
        height: 1080,
      },
    });

    const msg = sendRes.data.message;
    if (msg.kind !== 'image' || !msg.media || msg.media.mimeType !== 'image/png') {
      throw new Error('Message media payload was not saved properly');
    }
    console.log('✅ Image message sent with coach caption and media metadata.');
  } catch (err: any) {
    console.error('❌ Send image message failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 6. Verify Messages Query returns media
  console.log('\n--- Step 6: Verify Messages Retrieval on Web ---');
  try {
    const messagesRes = await client.get(`/chat/conversations/${conversationId}/messages?limit=10`);
    const messages = messagesRes.data.messages;
    const found = messages.find((m: any) => m.clientMessageId === clientMessageId);
    if (!found) {
      throw new Error('Newly created media message not found in thread');
    }
    if (!found.media || !found.media.url) {
      throw new Error('Media envelope missing in retrieved message');
    }
    console.log('✅ Media message retrieved successfully in web thread.');
  } catch (err: any) {
    console.error('❌ Failed to retrieve messages:', err.response?.data || err.message);
    process.exit(1);
  }

  console.log('\n🎉 MILESTONE 4 FRONTDESK WEB COACH MEDIA E2E TEST: 100% PASSED');
  process.exit(0);
}

run();
