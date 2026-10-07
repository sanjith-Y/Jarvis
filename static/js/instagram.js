/**
 * JARVIS Instagram Suite ("Insta")
 * Manages Instagram media inspecting, AI captions/hashtags generation, quick DMs, and post queue.
 */

class JarvisInstagramSuite {
  constructor() {
    this.queue = JSON.parse(localStorage.getItem('jarvis_insta_queue') || '[]');
  }

  // Parse Instagram link
  parseUrl(rawUrl) {
    const clean = rawUrl.trim();
    const reelMatch = clean.match(/\/reel\/([A-Za-z0-9_-]+)/);
    const postMatch = clean.match(/\/p\/([A-Za-z0-9_-]+)/);
    const storyMatch = clean.match(/\/stories\/([A-Za-z0-9_.-]+)/);
    
    let type = 'post';
    let code = null;

    if (reelMatch) {
      type = 'reel';
      code = reelMatch[1];
    } else if (postMatch) {
      type = 'post';
      code = postMatch[1];
    } else if (storyMatch) {
      type = 'story';
      code = storyMatch[1];
    }

    return { url: clean, type, code };
  }

  // Inspect & Fetch Reel / Post Details
  async inspectMedia(url) {
    const parsed = this.parseUrl(url);
    if (!parsed.code && !parsed.url.includes("instagram.com")) {
      throw new Error("Please enter a valid Instagram Reel or Post link.");
    }

    try {
      const response = await fetch('/api/instagram/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: parsed.url })
      });
      const data = await response.json();
      return { ...data, parsed };
    } catch (e) {
      // Fallback if offline
      return {
        success: true,
        shortcode: parsed.code,
        media_type: parsed.type,
        embed_url: parsed.code ? `https://www.instagram.com/${parsed.type}/${parsed.code}/embed/` : null,
        url: parsed.url,
        fallback: true
      };
    }
  }

  // Generate Instagram Caption, Hooks & Curated Hashtags
  generateContent(topic, tone = 'sophisticated', niche = 'tech') {
    const hashtagsDatabase = {
      tech: [
        '#Jarvis', '#ArtificialIntelligence', '#TechInnovation', '#PythonCoding',
        '#AIAssistant', '#DevelopersLife', '#CyberpunkTech', '#FutureTech',
        '#CodeDaily', '#SoftwareEngineering', '#MachineLearning', '#SmartAutomation'
      ],
      fitness: [
        '#FitnessMotivation', '#WorkoutDaily', '#IronMindset', '#PeakPerformance',
        '#Gains', '#HealthAndFitness', '#TrainHard', '#DisciplineEqualsFreedom',
        '#GymRat', '#FunctionalFitness'
      ],
      lifestyle: [
        '#AestheticLifestyle', '#DailyVibe', '#MindfulLiving', '#ModernLuxury',
        '#CreatorLife', '#VisualDiary', '#InspireDaily', '#Momentum'
      ],
      business: [
        '#Entrepreneurship', '#StartupLife', '#ScaleUp', '#StrategicGrowth',
        '#BusinessMindset', '#ProductivityHacks', '#SuccessHabits', '#FounderJourney'
      ],
      creative: [
        '#CreativeProcess', '#DesignInspiration', '#VisualArts', '#DigitalCreator',
        '#ArtDirection', '#MotionDesign', '#AestheticFeed', '#CreativeMinds'
      ]
    };

    const toneStyles = {
      sophisticated: {
        hook: `Protocol initiated: Redefining how we look at ${topic}.`,
        body: `Efficiency is not merely an advantage; it is the baseline. When optimizing ${topic}, every variable counts. Here is how modern systems approach it.`,
        cta: `Leave your thoughts below, or share with someone building the future.`
      },
      punchy: {
        hook: `Stop doing ${topic} the hard way. ⚡`,
        body: `Most people overcomplicate this. Keep it simple, execute with speed, and iterate. That's the secret to winning at ${topic}.`,
        cta: `Save this post before you forget. Double tap if you agree!`
      },
      hype: {
        hook: `THIS changes everything about ${topic}! 🚀🔥`,
        body: `You wouldn’t believe the results until you see it in action. Automated, seamless, and completely next level!`,
        cta: `Drop a 🔥 in the comments if you want the full breakdown!`
      },
      casual: {
        hook: `Quick take on ${topic}... 👀`,
        body: `Just spent the afternoon experimenting with this. The difference in workflow and clarity is night and day.`,
        cta: `What’s your current go-to approach? Let me know below!`
      }
    };

    const selectedTone = toneStyles[tone] || toneStyles.sophisticated;
    const nicheTags = hashtagsDatabase[niche] || hashtagsDatabase.tech;
    
    // Pick 8-10 targeted tags
    const selectedTags = [...nicheTags].sort(() => 0.5 - Math.random()).slice(0, 8);

    const fullCaption = `${selectedTone.hook}\n\n${selectedTone.body}\n\n${selectedTone.cta}\n\n---\n${selectedTags.join(' ')}`;

    return {
      hook: selectedTone.hook,
      body: selectedTone.body,
      cta: selectedTone.cta,
      tags: selectedTags,
      fullCaption
    };
  }

  // Generate Quick DM Link
  generateDmLink(username) {
    const cleanUser = username.replace('@', '').trim();
    return {
      username: cleanUser,
      link: `https://ig.me/m/${cleanUser}`,
      webLink: `https://www.instagram.com/direct/t/${cleanUser}/`
    };
  }

  // Queue Management
  addToQueue(item) {
    const postItem = {
      id: Date.now().toString(),
      title: item.title || 'Untitled Post',
      caption: item.caption || '',
      date: item.date || new Date().toISOString().split('T')[0],
      status: 'Scheduled',
      tags: item.tags || []
    };
    this.queue.unshift(postItem);
    this.saveQueue();
    return postItem;
  }

  removeFromQueue(id) {
    this.queue = this.queue.filter(q => q.id !== id);
    this.saveQueue();
  }

  saveQueue() {
    localStorage.setItem('jarvis_insta_queue', JSON.stringify(this.queue));
  }
}

window.JarvisInsta = new JarvisInstagramSuite();
