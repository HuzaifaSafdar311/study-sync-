import { WhatsAppService } from './whatsapp.service';
import { whatsAppStateManager } from './whatsapp.state';
import { courseService } from '../courses/course.service';
import { formatForWhatsApp } from './whatsapp.formatter';
import { buildWhatsAppCalendarMessage } from './whatsapp.calendar';
import { aiService } from '../ai/ai.service';
import { taskService } from '../tasks/task.service';
import { scheduleTaskReminders } from '../notifications/notification.queue';
import { parseAcademicDeadline } from '../ai/agent.service';
import prisma, { loadUserSettings } from '../../config/database';
import { systemQuotaService } from '../ai/systemQuota.service';

function matchCourse(query: string, courses: any[]): any {
  if (!query || !courses || courses.length === 0) return null;
  const q = query
    .trim()
    .toLowerCase()
    .replace(/^(?:course|subject|class|open|study|select)[\s:]+/i, '')
    .replace(/[\s\-_:]+/g, ' ')
    .trim();
  if (!q) return null;

  // 1. Exact match (case-insensitive)
  const exact = courses.find((c: any) => (c.name || '').trim().toLowerCase() === q);
  if (exact) return exact;

  // 2. Direct inclusion
  const direct = courses.find((c: any) => {
    const cName = (c.name || '').trim().toLowerCase();
    return cName.includes(q) || (q.length >= 2 && q.includes(cName));
  });
  if (direct) return direct;

  // 3. Known acronyms / common shortcuts
  const acronyms: Record<string, string[]> = {
    os: ['operating system', 'operating systems', 'os'],
    ml: ['machine learning', 'ml'],
    ai: ['artificial intelligence', 'ai'],
    db: ['database', 'database systems', 'dbms', 'db'],
    calc: ['calculus', 'math', 'algebra'],
    ds: ['data structure', 'data structures', 'dsa'],
    dsa: ['data structure', 'data structures', 'dsa'],
    cn: ['computer networks', 'computer network', 'networking', 'cn'],
    se: ['software engineering', 'se'],
    oop: ['object oriented programming', 'object oriented', 'oop'],
  };

  for (const [key, aliases] of Object.entries(acronyms)) {
    if (q === key || aliases.includes(q)) {
      const match = courses.find((c: any) => {
        const cName = (c.name || '').trim().toLowerCase();
        return cName === key || aliases.some((alias) => cName.includes(alias));
      });
      if (match) return match;
    }
  }

  // 4. Token / word boundary overlap
  const qTokens = q.split(/\s+/).filter((t: string) => t.length > 1);
  const tokenMatch = courses.find((c: any) => {
    const cTokens = (c.name || '').trim().toLowerCase().split(/\s+/);
    return qTokens.some((qt: string) => cTokens.some((ct: string) => ct === qt || ct.includes(qt) || qt.includes(ct)));
  });
  if (tokenMatch) return tokenMatch;

  return null;
}

export class WhatsAppHandler {
  private async resolveUserId(phone?: string): Promise<string> {
    const cleanPhone = (phone || '').replace(/\D/g, '');

    // 1. Try finding user by phone in DB
    if (cleanPhone) {
      try {
        const userByPhone = await prisma.user.findFirst({
          where: { whatsappNumber: cleanPhone },
        });
        if (userByPhone?.id) return userByPhone.id;
      } catch (e) {
        console.warn('[WhatsApp] Could not find user by whatsappNumber:', e);
      }
    }

    // 2. Try user_settings.json (configured email)
    try {
      const settings = loadUserSettings();
      if (settings?.email) {
        const userByEmail = await prisma.user.findFirst({
          where: { email: settings.email },
        });
        if (userByEmail?.id) {
          if (!userByEmail.whatsappNumber && cleanPhone) {
            prisma.user.update({
              where: { id: userByEmail.id },
              data: { whatsappNumber: cleanPhone },
            }).catch(() => {});
          }
          return userByEmail.id;
        }
      }
    } catch (e) {
      console.warn('[WhatsApp] Could not resolve user from settings:', e);
    }

    // 3. Fallback: find any registered student / admin who has courses
    try {
      const courses = await prisma.course.findMany({ take: 1, orderBy: { createdAt: 'desc' } });
      if (courses.length > 0 && courses[0].userId) {
        return courses[0].userId;
      }
    } catch {}

    return 'personal-user';
  }

  /**
   * Processes incoming WhatsApp messages and routes commands.
   */
  async handleIncomingMessage(service: WhatsAppService, msg: any): Promise<void> {
    const remoteJid = msg.key?.remoteJid;
    if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') {
      return; // Ignore group chats and status broadcasts
    }

    // ─── STRICT "ME / YOU" CHAT FILTER ────────────────────────────────
    // Only process messages from the student's personal self-chat ("You" / "Message yourself").
    const myPhone = service.getMyPhoneNumber() || '923030111550';
    const myLid = service.getMyLid();
    const chatIdentifier = remoteJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

    const isSelfChat =
      (Boolean(myPhone) && chatIdentifier === myPhone) ||
      (Boolean(myLid) && chatIdentifier === myLid);

    if (!isSelfChat) {
      // Completely ignore all messages sent to other contacts or received from other contacts
      return;
    }

    // Skip if message was sent by the bot itself (prevents infinite loop in "Me" chat)
    if (msg.key?.id && service.isSentByBot(msg.key.id)) {
      return;
    }

    // ─── EXTRACT CONTENT (Text or Audio Voice Note) ───────────────────
    const m = msg.message;
    if (!m) return;

    const inner =
      m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.documentWithCaptionMessage?.message ||
      m;

    let text = (
      inner.conversation ||
      inner.extendedTextMessage?.text ||
      inner.imageMessage?.caption ||
      inner.videoMessage?.caption ||
      inner.documentMessage?.caption ||
      ''
    ).trim();

    const isAudio = Boolean(inner.audioMessage || (inner.documentMessage?.mimetype?.startsWith('audio/')));

    if (!text && !isAudio) return;

    // Additional bot signature filter to prevent reflection loops in self-chat
    if (
      text.startsWith('🎓 *StudySync') ||
      text.startsWith('📚 *Connected to') ||
      text.startsWith('📚 *Switched to') ||
      text.startsWith('📚 *Please specify') ||
      text.startsWith('📅 *STUDYSYNC') ||
      text.startsWith('📅 *Your StudySync') ||
      text.startsWith('📅 *Calendar Event') ||
      text.startsWith('👋 *Exited') ||
      text.startsWith('💤 *StudySync') ||
      text.startsWith('🤖 *StudySync') ||
      text.startsWith('🔔 *StudySync') ||
      text.startsWith('❌ Course not found') ||
      text.startsWith('ℹ️ *StudySync') ||
      text.startsWith('ℹ️ You are in the main') ||
      text.startsWith('🎙️ *Lecture Voice') ||
      text.startsWith('🎙️ *Voice Note')
    ) {
      return;
    }

    // Always reply directly to the exact conversation thread where the message originated
    const replyJid = remoteJid;

    // Track active incoming message so replies are automatically quoted and decrypted properly
    service.setActiveIncomingMessage(msg);

    // Unified session key for this student
    const sessionKey = myPhone || 'personal-user';
    const session = whatsAppStateManager.getSession(sessionKey);
    whatsAppStateManager.updateActivity(sessionKey);
    const userId = await this.resolveUserId(myPhone);

    // ─── 0. VOICE NOTE / AUDIO INGESTION PIPELINE ─────────────────────
    if (isAudio) {
      console.log(`[WhatsApp Inbound Self-Chat Audio] Received voice note in state: ${session.state}`);

      if (session.state === 'OFF') {
        await service.sendMessage(
          replyJid,
          `🤖 *StudySync Assistant is currently OFF.*\n\nSend *agent on* to activate before recording lecture voice notes!`
        );
        return;
      }

      // 1. Download media buffer
      const audioBuffer = await service.downloadMedia(msg);
      if (!audioBuffer || audioBuffer.length === 0) {
        await service.sendMessage(
          replyJid,
          `⚠️ *Could not download voice note.* Please check your WhatsApp media settings and try sending again.`
        );
        return;
      }

      // 2. Transcribe via Groq Whisper STT
      const transcript = (await aiService.transcribeAudio(audioBuffer, 'lecture_voicenote.ogg')).trim();

      if (!transcript || transcript.length < 3) {
        await service.sendMessage(
          replyJid,
          `🎙️ *Voice Note Received, but no clear speech was detected.*\n\nPlease speak closer to the microphone and try recording again.`
        );
        return;
      }

      console.log(`[WhatsApp Voice Transcript] "${transcript}"`);

      // 3. Check if user spoke a system command
      const lowerTranscript = transcript.toLowerCase().trim().replace(/^[\/\s!#]+/, '');
      if (
        lowerTranscript === 'exit' ||
        lowerTranscript === 'leave' ||
        lowerTranscript === 'calendar' ||
        lowerTranscript === 'calander' ||
        lowerTranscript === 'schedule' ||
        lowerTranscript === 'weekly' ||
        lowerTranscript === 'semester' ||
        lowerTranscript === 'agent off' ||
        lowerTranscript === 'agent on'
      ) {
        text = lowerTranscript; // Pass into text command routing
      } else if (session.state === 'COURSE_CHAT' && session.activeCourseId) {
        // Check if student asked a direct question (e.g. "Paging kya hoti hai?", "Explain Banker's algorithm")
        const isQuestion =
          /\b(?:kya|kyun|kaise|kab|kon|konsa|explain|define|summarize|tell me|what|why|how|when|who|where|difference|samjha|samjhao|batao|bataiye)\b/i.test(transcript) ||
          transcript.trim().endsWith('?');

        const isLectureNoteIntent =
          /\b(?:professor|sir|mam|teacher|lecture|class|sir ne|prof ne|teacher ne|note|exam me|midterm me|final me|important|lazmi|topic)\b/i.test(transcript) ||
          !isQuestion;

        if (isQuestion && !isLectureNoteIntent) {
          console.log('[WhatsApp Voice Question] Treating voice note as an academic inquiry');
          text = transcript; // Route through Course RAG in step 6!
        } else {
          // ─── LECTURE NOTE EMBEDDING INTO FAISS ──────────────────────
          const courseId = session.activeCourseId;
          const courseName = session.activeCourseName || 'Course';

          const firstSentence = transcript.split(/[.!?\n]/)[0].trim();
          const shortTitle = firstSentence.length > 45 ? firstSentence.substring(0, 45) + '...' : firstSentence || 'Lecture Note';

          // 1. Ingest into Course FAISS Vector Store
          const ingestResult = await courseService.ingestMaterial(userId, {
            courseId,
            title: `Voice Note: ${shortTitle}`,
            content: transcript,
            sourceType: 'voice',
          });

          // 2. Auto-detect any deadlines (quizzes, assignments, exams)
          const autoScheduleResult = await courseService.autoScheduleTasksFromContent(
            userId,
            courseId,
            transcript
          );

          // 3. Append to course conversation history
          courseService.addAssistantSystemMessage(
            courseId,
            `🎙️ [Voice Note Transcribed]: "${transcript}"`
          );

          let reply = `🎙️ *Lecture Voice Note Captured & Embedded!* 🧠\n`;
          reply += `📚 *Course:* *${courseName}*\n`;
          reply += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          reply += `📝 *Transcribed Content:*\n> "${transcript}"\n\n`;
          reply += `✨ *Actions Taken:*\n`;
          reply += `• 💾 *Saved to Course Workspace*\n`;
          reply += `• 🧠 *Vector Embeddings Created:* Indexed ${ingestResult.chunksIndexed} chunk(s) into FAISS\n`;
          reply += `• 🔍 *RAG Ready:* You can now ask any question based on this lecture note!\n\n`;

          if (autoScheduleResult.created.length > 0) {
            reply += `📅 *Auto-Scheduled Deadlines Detected:*\n`;
            autoScheduleResult.created.forEach((t) => {
              const d = new Date(t.deadline);
              const dayStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              reply += `• 📌 *${t.title}* [${(t.type || 'Task').toUpperCase()}]\n   🗓️ Day: *${dayStr}*\n   🔔 24-hour proactive reminders armed!\n`;
            });
            reply += `\n`;
          }

          reply += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
          reply += `💡 _Tip: You can now ask questions about this lecture note anytime right here on WhatsApp!_`;

          await service.sendMessage(replyJid, reply);
          return;
        }
      } else {
        // ─── STANDBY MODE (NOT IN COURSE_CHAT) ────────────────────────
        // Check if student dictated a calendar task
        const extracted = await aiService.extractTaskFromTranscript(transcript);
        if (extracted && extracted.title && extracted.title !== 'null') {
          const targetDeadline = parseAcademicDeadline(extracted.deadline_iso || undefined, transcript);
          const task = await taskService.createTask(userId, {
            title: extracted.title,
            type: (extracted.type || 'assignment') as any,
            subject: extracted.subject || null,
            deadline: targetDeadline.toISOString(),
            priority: extracted.priority || 'high',
            description: `Scheduled via WhatsApp Voice Note: "${transcript}"`,
            source: 'voice',
          });
          await scheduleTaskReminders(task.id, userId);

          const dayStr = targetDeadline.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          let taskReply = `🎙️ *Voice Note Received & Scheduled on Calendar!* 📅\n`;
          taskReply += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          taskReply += `📝 *Transcript:* "${transcript}"\n\n`;
          taskReply += `📌 *Task:* *${task.title}* [${(task.type || 'Task').toUpperCase()}]\n`;
          if (task.subject) taskReply += `📚 *Subject:* ${task.subject}\n`;
          taskReply += `🗓️ *Day:* *${dayStr}*\n`;
          taskReply += `🔔 *Reminders:* 24-hour proactive alert armed!\n\n`;
          taskReply += `_View your full schedule anytime by sending *Calendar*._`;
          await service.sendMessage(replyJid, taskReply);
          return;
        }

        // Dictated lecture note without course:
        const courses = await courseService.getCourses(userId);
        const courseList = courses.map((c: any) => `• *Course ${c.name}*`).join('\n');
        let guideReply = `🎙️ *Voice Note Transcribed:*\n> "${transcript}"\n\n`;
        guideReply += `ℹ️ *You are currently in the main standby lobby.*\n`;
        guideReply += `To embed lecture notes into a specific course's FAISS knowledge base, please enter the course first:\n\n`;
        guideReply += `${courseList}\n\n`;
        guideReply += `👉 Reply: *Course <Course Name>* (e.g. *Course Operating Systems*) and send the voice note!`;
        await service.sendMessage(replyJid, guideReply);
        return;
      }
    }

    console.log(`[WhatsApp Inbound Self-Chat] "${text}"`);

    const lower = text.toLowerCase();

    // ─── 1. COMMAND: "agent on" ───────────────────────────────────────
    if (lower === 'agent on') {
      if (session.state !== 'OFF') {
        if (session.state === 'COURSE_CHAT' && session.activeCourseName) {
          await service.sendMessage(
            replyJid,
            `ℹ️ *StudySync Agent is already ON!* ✅\n\n` +
            `You are currently active in *${session.activeCourseName}* chatbot.\n` +
            `• Send any question to study with this course\n` +
            `• Type *exit* to return to the main menu\n` +
            `• Type *agent off* to deactivate`
          );
          return;
        } else {
          await service.sendMessage(
            replyJid,
            `ℹ️ *StudySync Agent is already ON!* ✅\n\n` +
            `You are in the main agent lobby.\n` +
            `• Send: *Course <Course Name>* to enter a course\n` +
            `• Send: *Calendar* (or *Weekly* / *Semester*) for day-wise schedule & quizzes\n` +
            `• Send: *agent off* to deactivate`
          );
          return;
        }
      }

      whatsAppStateManager.activateAgent(sessionKey);
      const courses = await courseService.getCourses(userId);

      const courseList = courses
        .map((c: any, i: number) => `${i + 1}. *${c.name}*`)
        .join('\n');

      const response =
        `🎓 *StudySync AI Agent is ON!* 🚀\n\n` +
        `Welcome! I am connected to your StudySync academic workspace.\n\n` +
        `📚 *Your Enrolled Courses:*\n` +
        `${courseList || '• No courses enrolled yet.'}\n\n` +
        `💬 *How to interact:*\n` +
        `👉 *Course <Course Name>* — Start chat with a course chatbot\n` +
        `   _(e.g., \`Course Database Systems\` or \`Course OS\`)_\n` +
        `👉 *Calendar* — Upcoming Quizzes, Assignments, Weekly Schedule & Semester Overview\n` +
        `👉 *agent off* — Turn off assistant`;

      await service.sendMessage(replyJid, response);
      return;
    }

    // ─── 2. COMMAND: "agent off" ──────────────────────────────────────
    if (lower === 'agent off') {
      whatsAppStateManager.deactivateAgent(sessionKey);
      const response =
        `💤 *StudySync Agent Deactivated.*\n\n` +
        `I am now in sleep mode. Send *agent on* whenever you want to study or manage your schedule!`;
      await service.sendMessage(replyJid, response);
      return;
    }

    // If agent is OFF, do not process further unless user asks to turn on
    if (session.state === 'OFF') {
      if (lower.includes('agent') || lower.includes('studysync') || lower.includes('help')) {
        await service.sendMessage(
          replyJid,
          `🤖 *StudySync Assistant is currently OFF.*\n\nSend *agent on* to activate!`
        );
      }
      return;
    }

    // ─── 3. COMMAND: "Course <Name>" or selecting course directly ───
    const courseCmdMatch = text.match(/^(?:course|subject|class|open|study|select)(?:[\s:]+(.+))?$/i);
    const isDirectCourseQuery = courseCmdMatch || (session.state === 'IDLE' && text.length >= 2 && text.length <= 40);

    if (isDirectCourseQuery) {
      const query = (courseCmdMatch ? (courseCmdMatch[1] || '') : text).trim().toLowerCase();

      // If user is currently in COURSE_CHAT:
      if (session.state === 'COURSE_CHAT') {
        if (!query) {
          // User sent just the word "course" while in COURSE_CHAT -> treat as normal chat!
        } else {
          const courses = await courseService.getCourses(userId);
          const matchedTarget = matchCourse(query, courses);

          if (matchedTarget) {
            if (matchedTarget.id === session.activeCourseId) {
              await service.sendMessage(
                replyJid,
                `ℹ️ You are already active in *${matchedTarget.name}* workspace!\n\n` +
                  `• Ask any question or concept from ${matchedTarget.name}\n` +
                  `• Share deadline/quiz dates (e.g. _"Kal 5 baje quiz ha"_)\n` +
                  `• Type *exit* to return to the main menu`
              );
              return;
            } else {
              // Switch to the other course
              whatsAppStateManager.enterCourse(sessionKey, matchedTarget.id, matchedTarget.name);
              const response =
                `📚 *Switched to Course:* *${matchedTarget.name}* ✅\n` +
                `🔐 _Official Course Workspace Active_\n\n` +
                `💬 *What you can do:*\n` +
                `• Ask any question or concept from ${matchedTarget.name}\n` +
                `• Type *exit* anytime to return to main menu`;
              await service.sendMessage(replyJid, response);
              return;
            }
          } else {
            // Did not match any course command, let it fall through to COURSE_CHAT as regular chat
          }
        }
      } else {
        // User is in IDLE mode (not inside a course)
        const courses = await courseService.getCourses(userId);

        if (!query) {
          const courseList = courses.map((c: any, i: number) => `${i + 1}. *Course ${c.name}*`).join('\n');
          await service.sendMessage(
            replyJid,
            `📚 *Please specify a course name:*\n\n${courseList}\n\n👉 Example: *Course ${courses[0]?.name || 'os'}*`
          );
          return;
        }

        const matched = matchCourse(query, courses);

        if (matched) {
          whatsAppStateManager.enterCourse(sessionKey, matched.id, matched.name);
          const courseHistory = await courseService.getChatHistory(matched.id, userId);
          const lastUserQuestions = courseHistory
            .filter((m: any) => m.role === 'user')
            .slice(-2)
            .map((m: any) => `• _"${m.text.substring(0, 50)}${m.text.length > 50 ? '...' : ''}"_`)
            .join('\n');

          let historyRecap = '';
          if (courseHistory.length > 0 && lastUserQuestions) {
            historyRecap = `\n📜 *Recent Discussion in this Course:*\n${lastUserQuestions}\n`;
          }

          const response =
            `📚 *Connected to Course:* *${matched.name}* ✅\n` +
            `🔐 _Official Course Workspace Active (Strictly Isolated)_\n` +
            historyRecap +
            `\n💬 *What you can do:*\n` +
            `• Ask any question or concept from ${matched.name} notes\n` +
            `• Share deadline/quiz dates (e.g. _"Kal 5 baje quiz ha"_)\n` +
            `• Type *history* to view recent chat history for this course\n` +
            `• Type *exit* anytime to return to the main agent menu`;

          await service.sendMessage(replyJid, response);
          return;
        } else if (courseCmdMatch) {
          // Only show "Course not found" if they explicitly used a course command keyword like "course foo"
          const availableList = courses
            .map((c: any) => `• *Course ${c.name}*`)
            .join('\n');
          await service.sendMessage(
            replyJid,
            `❌ Course not found for: *"${query}"*\n\n` +
              `📚 *Available Courses:*\n${availableList}\n\n` +
              `Please reply with: *Course <Course Name>*`
          );
          return;
        }
        // If it was just text in IDLE that didn't match a course and didn't have course keyword, fall through to IDLE prompt
      }
    }

    // ─── 4. COMMAND: "exit" or "leave" ────────────────────────────────
    if (lower === 'exit' || lower === 'leave' || lower === 'back' || lower === 'exit course') {
      if (session.state === 'COURSE_CHAT') {
        const prevName = session.activeCourseName || 'Course';
        whatsAppStateManager.exitCourse(sessionKey);
        const response =
          `👋 *Exited ${prevName} Chatbot.*\n\n` +
          `You are back in the main agent standby menu.\n\n` +
          `👉 Type *Course <Course Name>* to switch into another course.\n` +
          `👉 Type *Calendar* to view deadlines.\n` +
          `👉 Type *agent off* to deactivate.`;
        await service.sendMessage(replyJid, response);
      } else {
        await service.sendMessage(
          replyJid,
          `ℹ️ You are in the main agent menu. Type *agent off* to deactivate.`
        );
      }
      return;
    }

    // ─── 5. COMMAND: "calendar" / "schedule" / "weekly" / "semester" ──
    const cleanCmd = lower.replace(/^[\/\s!#]+/, '').trim();
    const isCalendarCommand =
      /^(?:calendar|calander|schedule|deadlines?|tasks?|weekly|semester|timetable|overview)$/i.test(cleanCmd) ||
      /\b(?:mera\s+calendar|calendar\s+dikhao|calendar\s+batao|mera\s+schedule|schedule\s+batao|weekly\s+schedule|semester\s+overview|upcoming\s+quizzes|upcoming\s+assignments)\b/i.test(lower);

    if (isCalendarCommand) {
      const [allTasks, courses] = await Promise.all([
        prisma.task.findMany({
          where: { userId },
          orderBy: { deadline: 'asc' },
        }),
        courseService.getCourses(userId),
      ]);

      const calendarMessage = buildWhatsAppCalendarMessage(allTasks, courses);
      await service.sendMessage(replyJid, calendarMessage);
      return;
    }

    // ─── 6. STATE: COURSE_CHAT (Academic RAG & Task Auto-Scheduling) ──
    if (session.state === 'COURSE_CHAT' && session.activeCourseId) {
      // Allow viewing official course history
      if (lower === 'history' || lower === 'chat history') {
        const history = await courseService.getChatHistory(session.activeCourseId, userId);
        if (history.length === 0) {
          await service.sendMessage(
            replyJid,
            `📜 *No previous chat history for ${session.activeCourseName}.*\nAsk any question to begin discussion!`
          );
          return;
        }
        const recent = history.slice(-6); // last 3 turns
        let historyText = `📜 *Official Chat History for ${session.activeCourseName}:*\n\n`;
        recent.forEach((m: any) => {
          const role = m.role === 'user' ? '👤 *You*' : '🤖 *AI*';
          const clean = formatForWhatsApp(m.text);
          historyText += `${role}: ${clean.substring(0, 160)}${clean.length > 160 ? '...' : ''}\n\n`;
        });
        historyText += `_Type your next question to continue discussion in ${session.activeCourseName}._`;
        await service.sendMessage(replyJid, historyText);
        return;
      }

      // Allow clearing history for this specific course
      if (lower === 'clear history' || lower === 'reset course') {
        courseService.clearChatHistory(session.activeCourseId);
        await service.sendMessage(
          replyJid,
          `🗑️ *Official chat history cleared for ${session.activeCourseName}.*\nYou have a clean slate for this course!`
        );
        return;
      }
      try {
        // Enforce System API quota (max 3 messages if not on BYOK)
        const quota = await systemQuotaService.checkSystemQuota(userId);
        if (!quota.allowed) {
          await service.sendMessage(
            replyJid,
            `⚠️ *Free System AI Limit Reached (3/3)*\n\nAapka 3 free system messages ka quota mukammal ho chuka hai.\n\nPlease StudySync web portal (*Settings ➔ AI API Keys*) par ja kar apni Google Gemini ya Groq API key lagayein taake chatbot WhatsApp par bhi bina rukawat ke active ho sake! 🚀`
          );
          return;
        }

        // Forward query to courseService.queryCourseRAG
        const ragResult = await courseService.queryCourseRAG(
          userId,
          session.activeCourseId,
          text
        );

        if (!quota.isByok) {
          systemQuotaService.incrementSystemUsage(userId);
        }

        let answer = ragResult.answer || 'I have processed your request.';

        // Format Markdown and LaTeX math cleanly into Unicode for WhatsApp
        answer = formatForWhatsApp(answer);

        // Check if any academic task (quiz, assignment, exam) was auto-scheduled from this message
        const taskCheckRegex = /(quiz|assignment|exam|deadline|due|schedule|remind|parso|kal|test|homework|project|submission)/i;
        if (taskCheckRegex.test(text)) {
          // Look up recently created task for this course in the last 15 seconds
          const recentTask = await prisma.task.findFirst({
            where: {
              userId,
              courseId: session.activeCourseId,
              createdAt: { gte: new Date(Date.now() - 15000) },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (recentTask) {
            const dl = new Date(recentTask.deadline);
            const dateStr = dl.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeStr = dl.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const calendarConfirmation =
              `\n\n═══════════════════════════\n` +
              `📅 *Calendar Event Auto-Scheduled!* ⏰\n` +
              `📌 *Task:* ${recentTask.title}\n` +
              `🏷️ *Type:* ${(recentTask.type || 'task').toUpperCase()}\n` +
              `🗓️ *Due:* ${dateStr} at ${timeStr}\n` +
              `🔔 *WhatsApp Reminder:* 24 hours prior automatic study plan alert is active!\n` +
              `═══════════════════════════`;

            answer += calendarConfirmation;
          }
        }

        await service.sendMessage(replyJid, answer);
      } catch (ragErr: any) {
        console.error('[WhatsApp] RAG error:', ragErr);
        await service.sendMessage(
          replyJid,
          `⚠️ Sorry, I encountered an issue while processing your question for *${session.activeCourseName}*. Please try again.`
        );
      }
      return;
    }

    // ─── 7. STATE: IDLE (Standby mode, prompt to choose course) ─────────
    if (session.state === 'IDLE') {
      const courses = await courseService.getCourses(userId);
      const courseList = courses
        .map((c: any, i: number) => `${i + 1}. *Course ${c.name}*`)
        .join('\n');

      const helpMsg =
        `🤖 *StudySync Assistant is in Standby.*\n\n` +
        `Please select a course to start learning or asking questions:\n\n` +
        `${courseList}\n\n` +
        `👉 Send: *Course <Course Name>* (e.g. *Course Database Systems*)\n` +
        `👉 Send: *Calendar* to view upcoming deadlines\n` +
        `👉 Send: *agent off* to deactivate`;

      await service.sendMessage(replyJid, helpMsg);
    }
  }
}

export const whatsAppHandler = new WhatsAppHandler();
