/**
 * The Primary 1 to SSS 3 Bible curriculum FRAMEWORK: class overviews, objectives and the topic map with primary Scripture references.
 * Topics are the framework. A topic becomes "complete" only when a reviewed lesson exists for it (see lessons-*.ts and the admin review queue).
 * Passage text is never stored here: it is read from the public-domain Bible data by reference.
 */
export type TopicSeed = [title: string, ref: string];
export interface ClassSeed {
  slug: string; name: string; stage: "Lower Primary" | "Upper Primary" | "Junior Secondary" | "Senior Secondary"; ageBand: string; title: string;
  overview: string; purpose: string; objectives: string[]; depth: string; topics: TopicSeed[];
}

export const STAGE_TEMPLATES: Record<ClassSeed["stage"], { rubric: { criterion: string; description: string }[]; parentSupport: string; teacherPrep: string }> = {
  "Lower Primary": {
    rubric: [
      { criterion: "Knows the story", description: "Retells the main events in order, with help from pictures." },
      { criterion: "Knows the verse", description: "Says the memory verse (or part of it) and where it is found." },
      { criterion: "Shows understanding", description: "Answers simple questions about what God is like and what the story teaches." },
      { criterion: "Takes part", description: "Joins in prayer, singing and activities respectfully." },
    ],
    parentSupport: "Read the Bible story together from a children's Bible, talk about the picture, say the memory verse at bedtime, and thank God together. Ask 'What did we learn about God today?' rather than testing your child.",
    teacherPrep: "Read the passage in a full Bible first, then the story. Gather pictures or props. Plan one memory-verse action, one activity and one prayer. Keep teaching to 10 minutes; repeat key words often.",
  },
  "Upper Primary": {
    rubric: [
      { criterion: "Knows the passage", description: "Explains what happens and who is involved, using the Bible text." },
      { criterion: "Places it in the story of the Bible", description: "Says where the passage fits (Old or New Testament, period, covenant)." },
      { criterion: "Finds and uses Scripture", description: "Locates passages quickly and quotes the memory verse accurately." },
      { criterion: "Applies it", description: "Gives a sensible, Scripture-based way to live out the lesson." },
    ],
    parentSupport: "Ask your child to find the passage in their own Bible and explain it to you. Talk about where it fits on the timeline. Help them keep a simple memory-verse card and review it weekly.",
    teacherPrep: "Study the passage and its context. Prepare a timeline or map. Prepare two 'find it yourself' activities and a discussion question that needs a Bible answer, not just opinion.",
  },
  "Junior Secondary": {
    rubric: [
      { criterion: "Observation", description: "Notes what the text actually says: key words, repeated ideas, structure and genre." },
      { criterion: "Interpretation", description: "Explains the meaning in its context, supported by the passage and cross-references." },
      { criterion: "Application", description: "Draws a fair application that does not contradict the original meaning." },
      { criterion: "Scripture skills", description: "Uses a concordance or cross-references and cites passages correctly." },
    ],
    parentSupport: "Invite your teenager to explain what they studied and how they know it from the text. Encourage honest questions; look for answers in the Bible together and speak to a pastor or teacher when needed.",
    teacherPrep: "Prepare the passage in two translations, a short background note and cross-references. Decide what students must discover for themselves. Read the advanced teacher notes for disputed points before class.",
  },
  "Senior Secondary": {
    rubric: [
      { criterion: "Exegesis", description: "Reads the passage in its literary, historical and canonical context and states the author's main claim." },
      { criterion: "Use of evidence", description: "Supports conclusions with the primary text and reliable, cited sources; distinguishes text from tradition." },
      { criterion: "Fair handling of views", description: "Presents major Christian interpretations accurately, says which are disputed, and reasons to a conclusion." },
      { criterion: "Communication and integrity", description: "Writes or speaks clearly, cites sources honestly and applies the passage responsibly." },
    ],
    parentSupport: "Ask your student to walk you through an argument from a passage, including where Christians disagree. Encourage reading the whole passage rather than single verses, and respectful discussion.",
    teacherPrep: "Work through the ten-step exegetical method yourself first. Prepare primary-text handouts, the major interpretive options and discussion questions that require evidence. Use the advanced notes; keep disputed matters labelled as disputed.",
  },
};

const T = (title: string, ref: string): TopicSeed => [title, ref];

export const CLASSES: ClassSeed[] = [
  {
    slug: "primary-1", name: "Primary 1", stage: "Lower Primary", ageBand: "About 5-6 years", title: "Foundations of Bible Learning", depth: "foundation",
    overview: "Children meet God as Creator and Father, the Bible as His Word, and Jesus as Saviour and friend, through short stories, pictures, songs, repetition and simple prayer.",
    purpose: "Introduce God, creation, the Bible, prayer, Jesus and simple Christian values through stories, pictures, repetition and activities.",
    objectives: ["Say that the Bible is God's Word and that God made everything.", "Retell about 20 well-known Bible stories with pictures.", "Say 12 short memory verses.", "Pray simply and show kindness, truthfulness and obedience."],
    topics: [
      T("The Bible is God's Word", "2 Timothy 3:16-17"), T("God created the world", "Genesis 1:1-31"), T("God made people", "Genesis 1:26-31"), T("Adam and Eve", "Genesis 2:15-3:24"),
      T("Noah and the ark", "Genesis 6:9-22; Genesis 8:1-22"), T("Abraham trusts God", "Genesis 12:1-9"), T("Joseph and his colourful coat", "Genesis 37:1-11"), T("Baby Moses", "Exodus 2:1-10"),
      T("God calls Moses", "Exodus 3:1-12"), T("David and Goliath", "1 Samuel 17:32-50"), T("Daniel and the lions", "Daniel 6:10-23"), T("The birth of Jesus", "Luke 2:1-20"),
      T("Jesus loves children", "Mark 10:13-16"), T("Jesus calms the storm", "Mark 4:35-41"), T("Jesus feeds the five thousand", "John 6:1-14"), T("The Good Samaritan", "Luke 10:25-37"),
      T("Jesus dies and rises again", "Luke 23:33-24:12"), T("Learning to pray", "Matthew 6:9-13"), T("Telling the truth", "Ephesians 4:25"), T("Sharing and caring", "Hebrews 13:16"),
      T("Obeying God and showing kindness", "Ephesians 4:32; Ephesians 6:1"), T("Learning the books of the Bible through songs or visual aids", "Psalms 119:105"),
    ],
  },
  {
    slug: "primary-2", name: "Primary 2", stage: "Lower Primary", ageBand: "About 6-7 years", title: "Knowing God and His People", depth: "foundation",
    overview: "Children follow God's people from Adam to the early Church, learning what God is like: good, faithful and forgiving, and how Jesus fulfils God's promises.",
    purpose: "Deepen the story of God and His people, with stories of promise, provision, faithfulness and forgiveness.",
    objectives: ["Tell the main stories from Genesis to Acts in order.", "Name some promises God made and kept.", "Say 14 memory verses.", "Practise prayer, forgiveness and kindness."],
    topics: [
      T("God's goodness and creation", "Psalms 136:1-9"), T("The fall and God's promise", "Genesis 3:1-15"), T("Noah's obedience", "Genesis 6:13-22"), T("Abraham and God's promise", "Genesis 15:1-6"),
      T("Isaac and Jacob", "Genesis 28:10-22"), T("Joseph forgives his brothers", "Genesis 45:1-15"), T("Moses and the Exodus", "Exodus 14:5-31"), T("God provides in the wilderness", "Exodus 16:1-18"),
      T("Joshua and Jericho", "Joshua 6:1-20"), T("Ruth's loyalty", "Ruth 1:1-18"), T("Samuel hears God's call", "1 Samuel 3:1-21"), T("David trusts God", "Psalms 23:1-6"),
      T("Solomon asks for wisdom", "1 Kings 3:5-14"), T("Elijah trusts God", "1 Kings 18:30-39"), T("Jonah and God's mercy", "Jonah 3:1-4:11"), T("Jesus' birth and childhood", "Luke 2:39-52"),
      T("Jesus calls His disciples", "Mark 1:16-20"), T("Jesus heals the sick", "Mark 2:1-12"), T("Jesus teaches through parables", "Matthew 13:1-9"), T("The lost sheep", "Luke 15:1-7"),
      T("The prodigal son", "Luke 15:11-24"), T("The cross and resurrection", "Matthew 27:32-28:10"), T("The early followers of Jesus", "Acts 2:42-47"), T("Prayer, forgiveness and kindness", "Colossians 3:12-13"),
    ],
  },
  {
    slug: "primary-3", name: "Primary 3", stage: "Lower Primary", ageBand: "About 7-8 years", title: "Exploring the Old and New Testaments", depth: "foundation",
    overview: "Children learn how the Bible is built, how the Old and New Testaments belong together, and meet covenants, the law, worship, prophets, Jesus and the early Church.",
    purpose: "Give a clear map of the Bible and its big events, connecting stories into one account of God's saving plan.",
    objectives: ["Describe how the Bible is arranged and find books quickly.", "Explain simply what a covenant is.", "Link major stories in order from Genesis to Acts.", "Show forgiveness, service and Christian character."],
    topics: [
      T("The structure of the Bible", "Psalms 119:105"), T("The books of Moses", "Deuteronomy 31:9-13"), T("Creation, fall and the promise of redemption", "Genesis 3:14-15"), T("Abraham and the covenant", "Genesis 17:1-8"),
      T("Jacob and the twelve tribes", "Genesis 35:9-12"), T("Joseph in Egypt", "Genesis 41:37-46"), T("Moses, the plagues and the Exodus", "Exodus 12:29-42"), T("The Ten Commandments", "Exodus 20:1-17"),
      T("The tabernacle and worship", "Exodus 25:8-9; Exodus 40:34-38"), T("Joshua and the promised land", "Joshua 1:1-9"), T("Judges and the need for godly leadership", "Judges 2:16-19"), T("Ruth and faithfulness", "Ruth 4:13-22"),
      T("Samuel, Saul and David", "1 Samuel 16:1-13"), T("David and the covenant promise", "2 Samuel 7:8-16"), T("Solomon and the temple", "1 Kings 8:22-30"), T("Psalms and worship", "Psalms 100:1-5"),
      T("Prophets who called people back to God", "Isaiah 1:16-20"), T("The birth and ministry of Jesus", "Luke 4:16-21"), T("Jesus' miracles", "John 2:1-11"), T("Parables of the kingdom", "Matthew 13:31-33"),
      T("Jesus' death and resurrection", "1 Corinthians 15:3-8"), T("Pentecost and the early Church", "Acts 2:1-13"), T("The fruit of Christian character", "Galatians 5:22-23"), T("Forgiveness, service and reconciliation", "Matthew 18:21-22"),
    ],
  },
  {
    slug: "primary-4", name: "Primary 4", stage: "Upper Primary", ageBand: "About 8-9 years", title: "The Story of God's People", depth: "context",
    overview: "Pupils read the Bible as one story, from creation to the beginning of the Church, with attention to the setting of each passage and the major divisions of the Bible.",
    purpose: "Teach basic context, biblical chronology and key themes through the story of God's people.",
    objectives: ["Name the major divisions of the Bible and what each contains.", "Place major events in order.", "Explain covenant, exodus, kingdom and exile in simple terms.", "Use Scripture to answer questions."],
    topics: [
      T("Understanding the Bible's major divisions", "Luke 24:44-45"), T("Creation and the human condition", "Genesis 1:26-28; Genesis 3:1-7"), T("Noah and the flood", "Genesis 6:5-8; Genesis 9:8-17"), T("Abraham and covenant", "Genesis 12:1-3; Genesis 15:1-21"),
      T("Isaac, Jacob and Joseph", "Genesis 50:15-21"), T("Israel in Egypt", "Exodus 1:6-14"), T("The Exodus and Passover", "Exodus 12:1-14"), T("Sinai and the covenant law", "Exodus 19:1-8"),
      T("Wilderness testing and provision", "Deuteronomy 8:1-5"), T("Entering Canaan", "Joshua 3:1-17"), T("Judges and Israel's repeated failures", "Judges 21:25"), T("Samuel and the monarchy", "1 Samuel 8:1-9"),
      T("David's reign and covenant", "2 Samuel 5:1-5; 2 Samuel 7:12-16"), T("Solomon, wisdom and the temple", "1 Kings 6:1-14"), T("The divided kingdom", "1 Kings 12:16-24"), T("Elijah, Elisha and prophetic ministry", "2 Kings 2:1-14"),
      T("Assyria and the northern kingdom", "2 Kings 17:5-18"), T("Judah, Babylon and exile", "2 Kings 25:1-12"), T("Return from exile", "Ezra 1:1-4"), T("The Gospels and the ministry of Jesus", "Mark 1:14-15"),
      T("The Sermon on the Mount", "Matthew 5:1-16"), T("Jesus' parables and miracles", "Mark 4:35-41"), T("The cross, resurrection and ascension", "Luke 24:36-53"), T("The beginning of the Church", "Acts 1:1-14"),
    ],
  },
  {
    slug: "primary-5", name: "Primary 5", stage: "Upper Primary", ageBand: "About 9-10 years", title: "Bible Geography, People and Covenants", depth: "context",
    overview: "Pupils learn the lands of the Bible, key people and the covenants, and how the Old Testament story leads to Jesus and the spread of the Church.",
    purpose: "Connect places, people and promises so that pupils can read the Bible with a map and a timeline.",
    objectives: ["Locate major Bible lands and cities on a map.", "Describe the covenants with Abraham, Moses and David.", "Explain the historical setting of the Gospels.", "Trace Paul's missionary journeys."],
    topics: [
      T("How the Bible is organised", "2 Timothy 3:16-17"), T("Bible lands and important locations", "Deuteronomy 8:7-10"), T("The patriarchs and covenant promises", "Genesis 26:1-5"), T("The Exodus and the wilderness", "Exodus 13:17-22"),
      T("Israel's judges and kings", "Judges 2:16-19; 1 Samuel 10:1"), T("David and the royal covenant", "2 Samuel 7:12-16"), T("Solomon and the temple", "2 Chronicles 6:1-11"), T("Israel and Judah", "1 Kings 12:16-20"),
      T("The major and minor prophets", "Amos 5:21-24"), T("The Assyrian and Babylonian exiles", "Jeremiah 29:4-11"), T("Ezra, Nehemiah and restoration", "Nehemiah 2:11-18"), T("The historical setting of the Gospels", "Luke 2:1-7"),
      T("The birth and identity of Jesus", "Matthew 1:18-25"), T("The kingdom of God", "Mark 1:14-15"), T("Parables, miracles and discipleship", "Mark 4:1-20"), T("The last week of Jesus' earthly ministry", "Mark 11:1-11"),
      T("The crucifixion and resurrection", "John 19:28-30; John 20:1-18"), T("The ascension and Pentecost", "Acts 1:6-11; Acts 2:1-4"), T("Paul's conversion and missionary journeys", "Acts 9:1-19"), T("The development of early Christian communities", "Acts 2:42-47"),
      T("Bible geography and timeline exercises", "Acts 13:1-3"), T("Faith, justice, mercy, responsibility and service", "Micah 6:8"),
    ],
  },
  {
    slug: "primary-6", name: "Primary 6", stage: "Upper Primary", ageBand: "About 10-11 years", title: "Connecting the Bible's Major Themes", depth: "themes",
    overview: "Pupils connect the Bible's big themes (creation, fall, redemption, covenant, kingdom, exile, Messiah, Spirit) and learn the first skills of interpreting a passage.",
    purpose: "Move from separate stories to connected themes, and begin to ask: what does the passage say, to whom, and why?",
    objectives: ["Trace creation-fall-redemption through the Bible.", "Explain how themes connect Old and New Testaments.", "Use context, audience and genre to read a passage.", "Revise Genesis to Revelation."],
    topics: [
      T("Creation, fall and redemption", "Genesis 3:15; Romans 5:12-19"), T("The covenant with Abraham", "Genesis 12:1-3; Galatians 3:8-9"), T("The Exodus and redemption imagery", "Exodus 12:12-13; 1 Corinthians 5:7"), T("Law, worship and holiness", "Leviticus 19:1-2; Leviticus 19:9-18"),
      T("Israel's kingship and covenant failure", "1 Samuel 8:4-9"), T("The Psalms and wisdom literature", "Psalms 1:1-6"), T("Prophetic calls to justice and repentance", "Isaiah 58:6-10"), T("Exile and restoration", "Jeremiah 29:10-14"),
      T("Messianic expectations in their biblical contexts", "Isaiah 9:6-7"), T("The identity and mission of Jesus", "Mark 10:45"), T("The kingdom of God", "Matthew 6:33"), T("The cross and resurrection", "Romans 4:25"),
      T("The Holy Spirit and the Church", "Acts 1:8"), T("The growth of the early Church", "Acts 6:7; Acts 9:31"), T("Introduction to Paul's letters", "Romans 1:1-7"), T("The unity and diversity of biblical books", "Hebrews 1:1-2"),
      T("How to find and interpret a Bible passage", "Acts 17:11"), T("Context, audience, genre and application", "Nehemiah 8:8"), T("Christian character and responsible leadership", "1 Timothy 4:12"), T("Revision across Genesis to Revelation", "Revelation 22:1-5"),
    ],
  },
  {
    slug: "jss-1", name: "JSS 1", stage: "Junior Secondary", ageBand: "About 11-12 years", title: "Introduction to Biblical Interpretation", depth: "interpretation",
    overview: "Students learn how the Bible came to us, how it is organised, and a simple method of Bible study: observation, interpretation, application.",
    purpose: "Introduce biblical interpretation skills while surveying the Bible's storyline.",
    objectives: ["Explain canon, inspiration and the Bible's divisions.", "Apply observe-interpret-apply to a passage.", "Survey Genesis to Acts with attention to context.", "Use cross-references and a concordance."],
    topics: [
      T("The Bible's canon, structure and major divisions", "Luke 24:44"), T("Inspiration, authorship and historical setting", "2 Peter 1:20-21"), T("Genesis and creation narratives", "Genesis 1:1-2:3"), T("Humanity, sin and redemption", "Genesis 3:1-24"),
      T("The patriarchal narratives", "Genesis 12:1-9"), T("Abrahamic covenant themes", "Genesis 15:1-21"), T("Exodus, Passover and Sinai", "Exodus 12:1-14; Exodus 19:1-6"), T("Israel's law and covenant obligations", "Deuteronomy 6:4-9"),
      T("Joshua, Judges and the settlement narratives", "Joshua 24:14-25"), T("Samuel, Saul and David", "1 Samuel 16:1-13"), T("The Davidic covenant", "2 Samuel 7:8-17"), T("Solomon and the divided monarchy", "1 Kings 11:9-13; 1 Kings 12:1-20"),
      T("Prophetic ministry and covenant accountability", "Jeremiah 7:1-11"), T("Exile and restoration", "Ezekiel 36:24-28"), T("The historical setting of the New Testament", "Galatians 4:4"), T("The four Gospels and their distinctive presentations", "Luke 1:1-4"),
      T("Jesus' teaching and miracles", "Mark 1:21-28"), T("Parables and literary interpretation", "Mark 4:10-20"), T("The death and resurrection of Jesus", "1 Corinthians 15:3-8"), T("Acts and the formation of the Church", "Acts 2:37-47"),
      T("Introduction to Bible study methods", "Acts 17:11; 2 Timothy 2:15"), T("Observation, interpretation and application", "James 1:22-25"), T("Memory verses and Scripture research", "Psalms 119:9-11"), T("Revision and CBT assessment", "2 Timothy 3:16-17"),
    ],
  },
  {
    slug: "jss-2", name: "JSS 2", stage: "Junior Secondary", ageBand: "About 12-13 years", title: "The Life of Christ and the Early Church", depth: "interpretation",
    overview: "Students study the Gospels and Acts in their Jewish and Roman setting, following the life of Jesus, the cross and resurrection, and the birth and growth of the Church.",
    purpose: "Read the Gospels and Acts carefully in context and learn to interpret parables, miracles and epistles.",
    objectives: ["Describe the Jewish and Roman setting of the New Testament.", "Trace Jesus' ministry from birth to ascension.", "Explain how Acts shows the Church's growth.", "Read an epistle in its setting."],
    topics: [
      T("Jewish society and the Roman setting of the New Testament", "Luke 2:1-3; Luke 3:1-2"), T("The birth narratives of Jesus", "Matthew 1:18-2:12"), T("The baptism and temptation of Jesus", "Matthew 3:13-4:11"), T("The kingdom of God", "Mark 1:14-15; Luke 17:20-21"),
      T("The Sermon on the Mount", "Matthew 5:1-12"), T("Parables and their contexts", "Luke 15:1-32"), T("Healing, deliverance and other Gospel miracles", "Mark 5:1-20"), T("Jesus' relationship with religious leaders", "Mark 2:23-3:6"),
      T("Discipleship and the cost of following Jesus", "Luke 9:23-26; Luke 14:25-33"), T("The transfiguration", "Mark 9:2-13"), T("The final week in Jerusalem", "Mark 11:1-12:44"), T("The Last Supper and its biblical background", "Luke 22:7-20; Exodus 12:1-14"),
      T("Crucifixion and resurrection", "Luke 23:33-24:12"), T("The resurrection appearances", "Luke 24:13-35; John 20:19-29"), T("Ascension and the promise of the Spirit", "Acts 1:1-11"), T("Pentecost and the early Church", "Acts 2:1-41"),
      T("Peter and the mission to Gentiles", "Acts 10:1-48"), T("Paul's conversion", "Acts 9:1-19"), T("Paul's missionary journeys", "Acts 13:1-3; Acts 16:6-10"), T("The Jerusalem Council", "Acts 15:1-29"),
      T("The letters of Paul and their recipients", "Philemon 1:1-25"), T("The general epistles", "James 2:14-26"), T("Christian community and spiritual gifts", "1 Corinthians 12:4-27"), T("Exegetical reading of selected passages", "Acts 8:26-40"),
    ],
  },
  {
    slug: "jss-3", name: "JSS 3", stage: "Junior Secondary", ageBand: "About 13-14 years", title: "Christian Doctrine, Character and Biblical Themes", depth: "interpretation",
    overview: "Students study core Christian doctrine from Scripture (God, humanity, Christ, the Spirit, the Church, salvation), Christian character and ethics, and how to prepare and defend a Bible study.",
    purpose: "Build a Scripture-based understanding of Christian doctrine and character, and the skill to prepare a Bible study.",
    objectives: ["Explain core doctrines with Scripture.", "Describe the fruit and gifts of the Spirit.", "Read Revelation responsibly.", "Prepare and defend a Bible study using the text."],
    topics: [
      T("The doctrine of God in Scripture", "Deuteronomy 6:4; Matthew 28:19"), T("Humanity, sin and the image of God", "Genesis 1:26-27; Romans 3:23"), T("Covenant and promise", "Jeremiah 31:31-34"), T("The person and work of Jesus Christ", "Philippians 2:5-11; Colossians 1:15-20"),
      T("The death and resurrection of Christ", "1 Corinthians 15:1-11"), T("The Holy Spirit in biblical teaching", "John 14:15-26"), T("The Church and its mission", "Matthew 28:18-20; Ephesians 4:11-16"), T("Salvation, grace, faith and discipleship", "Ephesians 2:8-10"),
      T("Prayer, worship and spiritual formation", "Matthew 6:5-15"), T("Justice, mercy and compassion", "Micah 6:8; James 1:27"), T("Wisdom literature and decision-making", "Proverbs 3:5-8"), T("Prophets, repentance and restoration", "Joel 2:12-14"),
      T("Biblical teaching on leadership", "Mark 10:42-45"), T("The fruit of the Spirit", "Galatians 5:16-26"), T("Spiritual gifts and Christian service", "Romans 12:3-8"), T("The Great Commission", "Matthew 28:18-20"),
      T("Introduction to biblical eschatology", "Acts 1:6-11; 1 Thessalonians 4:13-18"), T("Reading Revelation responsibly", "Revelation 1:1-8"), T("Christian ethics and digital responsibility", "Ephesians 4:25-32"), T("Conflict resolution and forgiveness", "Matthew 18:15-22"),
      T("How to prepare a Bible study", "Ezra 7:10"), T("How to defend an interpretation with Scripture", "1 Peter 3:15-16"), T("Revision and mock CBT examinations", "2 Timothy 2:15"),
    ],
  },
  {
    slug: "sss-1", name: "SSS 1", stage: "Senior Secondary", ageBand: "About 14-15 years", title: "Biblical Theology and Exegesis", depth: "exegesis",
    overview: "Students learn exegetical method and biblical theology: how the canon was received, how genres work, and how covenant, kingdom, temple and Messiah develop across the Bible.",
    purpose: "Train students to read the Bible in literary, historical and canonical context and to follow major themes through the whole canon.",
    objectives: ["Apply an exegetical method to a passage.", "Explain the major covenants and how they relate.", "Describe the Second Temple setting of the New Testament.", "Distinguish text from tradition when studying prophecy and fulfilment."],
    topics: [
      T("The canon and formation of the biblical texts", "Luke 24:44"), T("Biblical genres and interpretive methods", "Nehemiah 8:8"), T("Historical and literary context", "Jeremiah 29:1-14"), T("Hebrew Bible background and the Old Testament storyline", "Deuteronomy 6:20-25"),
      T("Creation, fall and the biblical theology of humanity", "Genesis 1:26-28; Genesis 3:1-24"), T("The Abrahamic covenant", "Genesis 12:1-3; Genesis 15:1-21; Genesis 17:1-14"), T("Exodus, covenant and the law", "Exodus 19:1-8; Exodus 24:1-8"), T("Land, kingship and the Davidic covenant", "2 Samuel 7:1-17"),
      T("Temple, priesthood and sacrifice", "Leviticus 16:1-34; Hebrews 9:11-14"), T("Wisdom literature and the Psalms", "Proverbs 1:1-7; Psalms 1:1-6"), T("Prophetic literature and covenant judgment", "Amos 2:6-16"), T("Exile, restoration and hope", "Isaiah 40:1-11"),
      T("The Second Temple setting of the New Testament", "Luke 1:5-25"), T("The Gospels and their theological emphases", "Luke 1:1-4; John 20:30-31"), T("The identity and mission of Jesus", "Mark 8:27-38"), T("The kingdom of God in Jesus' teaching", "Mark 1:14-15; Luke 4:16-21"),
      T("Cross, resurrection and ascension", "Luke 24:44-53"), T("Acts and the mission of the Church", "Acts 1:8; Acts 28:30-31"), T("Introduction to Pauline theology", "Romans 1:16-17"), T("Introduction to general epistles", "1 Peter 1:3-9"),
      T("Exegetical case studies", "Psalms 22:1-31"), T("Bible research, citation and interpretation", "Acts 17:10-12"), T("Prophecy and fulfilment in biblical context", "Matthew 2:1-6; Micah 5:2"), T("Revision and formal assessment", "2 Timothy 3:14-17"),
    ],
  },
  {
    slug: "sss-2", name: "SSS 2", stage: "Senior Secondary", ageBand: "About 15-16 years", title: "Prophecy, Apostolic Teaching and Christian Doctrine", depth: "exegesis",
    overview: "Students study how prophecy works, how the New Testament uses the Old, the apostles' teaching on grace, the Spirit and the Church, and the interpretive options on disputed end-times passages.",
    purpose: "Handle prophetic and apostolic texts responsibly, comparing interpretations by the primary evidence.",
    objectives: ["State principles for interpreting prophetic literature.", "Explain how apostolic writers use the Old Testament.", "Summarise Paul's teaching on grace, faith and justification.", "Compare major Christian views on disputed eschatological passages fairly."],
    topics: [
      T("Principles for interpreting prophetic literature", "Deuteronomy 18:21-22; Isaiah 7:1-17"), T("Prophets in their historical settings", "Isaiah 1:1; Jeremiah 1:1-3"), T("Near-term and longer-term prophetic horizons where supported by the text", "Isaiah 7:10-17; Matthew 1:22-23"), T("Messianic interpretation in the Old and New Testaments", "Psalms 110:1-4; Acts 2:29-36"),
      T("Covenant promises and fulfilment", "2 Corinthians 1:18-22"), T("The relationship between Old Testament texts and New Testament quotations", "Hosea 11:1; Matthew 2:13-15"), T("Jesus' teaching about the kingdom and the future", "Mark 13:1-37"), T("Acts and apostolic mission", "Acts 13:1-52"),
      T("Paul's teaching on grace, faith and justification", "Romans 3:21-5:2"), T("Union with Christ and Christian transformation", "Romans 6:1-14"), T("The Holy Spirit and the life of the Church", "Romans 8:1-17"), T("Apostolic teaching on the Church and its mission", "Ephesians 2:11-22"),
      T("The Lord's Supper and Christian fellowship", "1 Corinthians 11:17-34"), T("The resurrection and Christian hope", "1 Corinthians 15:12-58"), T("General epistles and practical discipleship", "James 1:1-27"), T("Biblical views of suffering and perseverance", "1 Peter 4:12-19; Romans 5:3-5"),
      T("Revelation's historical setting, symbolism and literary structure", "Revelation 1:1-20"), T("Different Christian interpretations of disputed eschatological passages", "Revelation 20:1-6"), T("Apostolic teaching and the use of Old Testament Scripture", "Acts 15:13-18; Amos 9:11-12"), T("Comparing interpretations using primary biblical evidence", "Acts 17:11"),
      T("Exegetical essays and presentations", "Philippians 2:5-11"), T("Research ethics and responsible use of sources", "Proverbs 12:22"), T("Revision and CBT assessment", "2 Timothy 2:15"),
    ],
  },
  {
    slug: "sss-3", name: "SSS 3", stage: "Senior Secondary", ageBand: "About 16-17 years", title: "Advanced Bible Study, Ministry and Biblical Worldview", depth: "advanced",
    overview: "Students bring everything together: the Bible's whole story, advanced exegesis of Old Testament and Gospel passages, ministry and ethics, prophecy and modern claims, apologetics, and a capstone Bible study.",
    purpose: "Equip graduates to read, teach and live Scripture faithfully, handle disputed matters with integrity and serve in ministry.",
    objectives: ["Tell and defend the Bible's overarching narrative.", "Produce an exegetical Bible study from a chosen passage.", "Evaluate claims of modern prophecy by Scripture.", "Complete a ministry or capstone project."],
    topics: [
      T("The Bible's overarching narrative", "Luke 24:25-27"), T("Advanced exegesis of selected Old Testament passages", "Isaiah 52:13-53:12"), T("Advanced exegesis of Gospel passages", "Mark 10:32-45"), T("The theology of the cross and resurrection", "1 Corinthians 1:18-25; 1 Corinthians 15:3-8"),
      T("Biblical covenants and canonical relationships", "Hebrews 8:1-13"), T("The mission of the Church in Acts and the epistles", "Acts 1:8; Romans 15:14-21"), T("Apostolic teaching on holiness and Christian ethics", "1 Thessalonians 4:1-12"), T("Biblical leadership and servant ministry", "1 Peter 5:1-4; John 13:1-17"),
      T("Biblical perspectives on family, relationships and responsibility", "Ephesians 5:21-6:4"), T("Justice, mercy, poverty and care for vulnerable people", "Isaiah 1:16-17; James 2:1-9"), T("Biblical prophecy and its interpretive traditions", "Daniel 9:20-27"), T("Daniel and Revelation: genre, context and theological themes", "Daniel 7:1-14; Revelation 5:1-14"),
      T("Eschatological hope, resurrection and final judgment", "1 Corinthians 15:50-58; Revelation 21:1-5"), T("Unity and diversity in Christian doctrine", "Ephesians 4:1-6"), T("Evaluating claims of modern prophecy responsibly", "1 Thessalonians 5:19-22; 1 John 4:1-6"), T("How to distinguish biblical teaching from speculation", "Deuteronomy 29:29; Acts 1:6-8"),
      T("Preparing and presenting an exegetical Bible study", "2 Timothy 2:15"), T("Developing a Scripture-supported Christian worldview", "Colossians 2:6-8"), T("Evangelism, discipleship and the Great Commission", "Matthew 28:18-20"), T("Christian apologetics and respectful dialogue", "1 Peter 3:15-16"),
      T("Ministry project or capstone Bible study", "2 Timothy 4:1-5"), T("Final revision and comprehensive CBT examination", "Revelation 22:18-21"),
    ],
  },
];
