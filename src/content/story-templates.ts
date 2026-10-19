import type { SceneSeed } from "./story-types";

/**
 * Scene-by-scene storybook content for the eleven ready-made templates. Text is an original retelling for children and families;
 * each scene points to the Bible passage it retells (the passage text itself is read from the Bible data, never retyped here).
 * Keys are story slugs.
 */
export const TEMPLATE_SCENES: Record<string, SceneSeed[]> = {
  "noah-and-the-flood": [
    { title: "A world full of trouble", ref: "Genesis 6:5-12", art: "dusk:hills:tree", text: "People had stopped listening to God and the earth was full of violence. God was sad. But one man, Noah, walked closely with God." },
    { title: "Build an ark", ref: "Genesis 6:13-22", art: "day:hills:boat", text: "God told Noah to build a very large boat called an ark, and explained how to make it. Noah did everything just as God commanded." },
    { title: "Two by two", ref: "Genesis 7:1-16", art: "day:hills:boat,family", text: "God told Noah to bring his family and pairs of every kind of animal into the ark. When they were all inside, God shut the door." },
    { title: "The rain and the waters", ref: "Genesis 7:17-24", art: "storm:sea:boat,wave", text: "The rain fell and the waters rose and lifted the ark high above the earth. Inside, God kept Noah, his family and all the animals safe." },
    { title: "The waters go down", ref: "Genesis 8:1-19", art: "dawn:sea:boat,dove", text: "God remembered Noah. The waters went down and the ark came to rest on the mountains. Noah sent out a dove, which returned with an olive leaf. At last they stepped out onto dry ground." },
    { title: "God's rainbow promise", ref: "Genesis 9:8-17", art: "day:hills:rainbow", text: "Noah thanked God. God promised never again to destroy the earth with a flood, and put a rainbow in the clouds as a sign of His promise." },
  ],
  "david-and-goliath": [
    { title: "A giant's challenge", ref: "1 Samuel 17:1-11", art: "day:hills:wall", text: "The Philistine army stood on one hill and Israel on another. A giant named Goliath shouted a challenge every morning, and Israel's soldiers were afraid." },
    { title: "The shepherd boy", ref: "1 Samuel 17:12-31", art: "day:hills:lamb", text: "David, the youngest son of Jesse, brought food to his brothers. He heard Goliath and asked why no one would stand up for the army of the living God." },
    { title: "David trusts God", ref: "1 Samuel 17:32-40", art: "day:hills:sling", text: "David told King Saul how God had helped him protect his sheep. He refused Saul's armour, took his staff, five smooth stones and his sling." },
    { title: "In the name of the Lord", ref: "1 Samuel 17:41-47", art: "day:hills:sling,sun", text: "Goliath laughed at David. David answered, 'You come with sword and spear, but I come in the name of the Lord. The battle is the Lord's.'" },
    { title: "The stone and the victory", ref: "1 Samuel 17:48-54", art: "day:hills:sling", text: "David ran toward Goliath, slung a stone, and Goliath fell. The Philistines fled and Israel knew that God had saved them." },
  ],
  "joseph-and-his-brothers": [
    { title: "Joseph's dreams and coat", ref: "Genesis 37:1-11", art: "day:hills:coat", text: "Jacob loved Joseph and gave him a special coat. Joseph had dreams that his family would one day bow to him, and his brothers grew jealous." },
    { title: "Sold into Egypt", ref: "Genesis 37:12-36", art: "dusk:desert:coat", text: "The brothers seized Joseph and sold him to traders who took him to Egypt. They told their father that Joseph was dead." },
    { title: "God is with Joseph", ref: "Genesis 39:1-23", art: "dusk:city:coat", text: "In Egypt Joseph served Potiphar faithfully. He was falsely accused and put in prison, but the Lord was with him there too." },
    { title: "From prison to palace", ref: "Genesis 41:14-45", art: "day:city:crown", text: "Pharaoh had troubling dreams. Joseph, by God's help, explained them and advised storing food. Pharaoh made Joseph a ruler over Egypt." },
    { title: "The brothers come", ref: "Genesis 42:1-8; Genesis 45:1-8", art: "day:desert:wheat", text: "A famine reached Canaan. Joseph's brothers came to Egypt for grain and did not recognise him. At last Joseph said, 'I am Joseph.'" },
    { title: "Forgiveness", ref: "Genesis 45:9-15; Genesis 50:19-21", art: "dawn:city:family", text: "Joseph wept and forgave his brothers, saying that though they meant evil, God meant it for good, to save many lives." },
  ],
  "red-sea": [
    { title: "Let my people go", ref: "Exodus 12:29-33", art: "night:desert:lamb", text: "After the night of the Passover, Pharaoh finally told Moses and the Israelites to leave Egypt." },
    { title: "A cloud and a fire", ref: "Exodus 13:17-22", art: "dusk:desert:cloud,fire", text: "God led Israel by a pillar of cloud by day and a pillar of fire by night, so that they could travel day and night." },
    { title: "Trapped by the sea", ref: "Exodus 14:5-12", art: "dusk:sea:wave", text: "Pharaoh changed his mind and chased Israel. The people were trapped with the sea in front and the army behind, and they cried out." },
    { title: "Do not be afraid", ref: "Exodus 14:13-20", art: "night:sea:cloud", text: "Moses said, 'Do not be afraid. Stand firm and see the Lord's salvation. The Lord will fight for you.' The cloud moved between Israel and Egypt." },
    { title: "Through the sea", ref: "Exodus 14:21-31", art: "dawn:sea:wave", text: "Moses stretched out his hand and the Lord drove back the sea. Israel walked through on dry ground. When the Egyptians followed, the waters returned. Israel saw the great power of the Lord and put their trust in Him." },
  ],
  "daniel-lions": [
    { title: "A faithful servant", ref: "Daniel 6:1-5", art: "day:city:crown", text: "Daniel served the king of Babylon and Persia so well that the king planned to set him over the whole kingdom. Jealous officials looked for a way to trap him." },
    { title: "A trap in the law", ref: "Daniel 6:6-9", art: "day:city:scroll", text: "The officials persuaded the king to make a law: for thirty days anyone who prayed to any god or man except the king would be thrown to the lions." },
    { title: "Daniel prays", ref: "Daniel 6:10-15", art: "dusk:city:lamp", text: "Daniel knew about the law but went home, opened his windows toward Jerusalem and prayed three times a day, as he always had. The officials reported him." },
    { title: "The lions' den", ref: "Daniel 6:16-18", art: "night:city:lion", text: "The king was troubled but the law could not be changed. Daniel was thrown into the den, and the king said, 'May your God, whom you serve continually, rescue you.'" },
    { title: "God shuts the lions' mouths", ref: "Daniel 6:19-23", art: "dawn:city:lion", text: "At dawn the king hurried to the den. Daniel answered, 'My God sent his angel and shut the mouths of the lions.' He was unharmed because he trusted God." },
    { title: "The king honours God", ref: "Daniel 6:25-28", art: "day:city:crown", text: "King Darius told everyone to fear and reverence the living God, whose kingdom will never be destroyed." },
  ],
  "jonah-and-nineveh": [
    { title: "A hard task", ref: "Jonah 1:1-3", art: "day:sea:boat", text: "God told Jonah to go to Nineveh and warn its people. Jonah did not want to, so he boarded a ship going the other way." },
    { title: "The great storm", ref: "Jonah 1:4-16", art: "storm:sea:boat,wave", text: "God sent a great storm. The sailors were afraid. Jonah told them the storm was because of him, and they threw him overboard. The sea grew calm." },
    { title: "Inside the fish", ref: "Jonah 1:17-2:10", art: "night:sea:fish", text: "God sent a great fish to swallow Jonah. For three days and nights Jonah prayed, thanking God for hearing him. The fish then spat Jonah onto dry land." },
    { title: "Nineveh listens", ref: "Jonah 3:1-10", art: "day:city:scroll", text: "God spoke to Jonah a second time. This time he obeyed and told Nineveh to turn from evil. The people believed God and repented, and God showed them mercy." },
    { title: "Jonah's anger", ref: "Jonah 4:1-5", art: "day:desert:tent", text: "Jonah was angry that God forgave Nineveh. He knew that God is gracious and compassionate, slow to anger and rich in love." },
    { title: "God's question", ref: "Jonah 4:6-11", art: "dawn:desert:tree", text: "God grew a plant to shade Jonah, then let it die. God asked Jonah whether he should not care about Nineveh, a great city full of people. The book ends with God's question." },
  ],
  "birth-of-jesus": [
    { title: "A journey to Bethlehem", ref: "Luke 2:1-5", art: "night:hills:star", text: "A census was ordered, so Joseph took Mary, who was expecting a baby, from Nazareth to Bethlehem, the town of David." },
    { title: "No room at the inn", ref: "Luke 2:6-7", art: "night:city:manger", text: "While they were there, Mary gave birth to her firstborn son. She wrapped Him in cloths and laid Him in a manger, because there was no guest room available." },
    { title: "Angels and shepherds", ref: "Luke 2:8-14", art: "night:hills:star", text: "In the fields nearby, shepherds watched their flocks. An angel appeared and said, 'I bring you good news of great joy: today in the town of David a Saviour has been born, who is Christ the Lord.'" },
    { title: "Shepherds visit the Saviour", ref: "Luke 2:15-20", art: "night:hills:manger", text: "The shepherds hurried to Bethlehem and found Mary, Joseph and the baby lying in the manger. They told everyone what they had heard and returned glorifying God." },
    { title: "Wise men follow a star", ref: "Matthew 2:1-12", art: "night:desert:star", text: "Magi from the east came to Jerusalem asking where the king of the Jews was born, for they had seen His star. The scribes pointed to Bethlehem as the prophet had said." },
    { title: "Gifts and worship", ref: "Matthew 2:9-12", art: "dawn:city:star,manger", text: "The star led them to the child. They bowed down and worshipped Him and gave Him gifts of gold, frankincense and myrrh." },
  ],
  "good-samaritan": [
    { title: "A lawyer's question", ref: "Luke 10:25-29", art: "day:city:scroll", text: "An expert in the law asked Jesus, 'What must I do to inherit eternal life?' and then, wanting to justify himself, 'Who is my neighbour?'" },
    { title: "Attacked on the road", ref: "Luke 10:30", art: "day:hills:road", text: "Jesus told of a man travelling from Jerusalem to Jericho who was attacked by robbers, beaten and left half dead." },
    { title: "Two who passed by", ref: "Luke 10:31-32", art: "day:hills:road", text: "A priest came along and passed by on the other side. A Levite also came, looked, and passed by on the other side." },
    { title: "A Samaritan stops", ref: "Luke 10:33-35", art: "day:hills:road", text: "Then a Samaritan, whom Jews looked down on, saw the man and had compassion. He bandaged his wounds, took him to an inn and paid for his care." },
    { title: "Go and do likewise", ref: "Luke 10:36-37", art: "dawn:hills:road", text: "Jesus asked, 'Which of these three was a neighbour to the man?' The lawyer said, 'The one who had mercy.' Jesus said, 'Go and do likewise.'" },
  ],
  "prodigal-son": [
    { title: "The younger son leaves", ref: "Luke 15:11-13", art: "day:hills:family", text: "A younger son asked his father for his share of the inheritance, then travelled far away and wasted it all." },
    { title: "Hungry and alone", ref: "Luke 15:14-16", art: "dusk:desert:tree", text: "A famine came and he had nothing. He took a job feeding pigs and longed to eat their food." },
    { title: "He comes to himself", ref: "Luke 15:17-20", art: "dawn:hills:road", text: "He realised that his father's servants had plenty. He decided to go home and say, 'Father, I have sinned against heaven and against you.'" },
    { title: "The father runs", ref: "Luke 15:20-24", art: "day:hills:family,road", text: "While the son was still far off, his father saw him, was filled with compassion, ran to him and embraced him. He called for the best robe, a ring and a feast." },
    { title: "The older brother", ref: "Luke 15:25-32", art: "dusk:hills:family", text: "The older brother, working in the field, was angry and would not join the celebration. His father came out and said, 'We had to celebrate, because your brother was dead and is alive again; he was lost and is found.'" },
  ],
  "feeding-five-thousand": [
    { title: "A crowd follows Jesus", ref: "John 6:1-5", art: "day:hills:cloud", text: "A great crowd followed Jesus because they had seen His signs. Jesus went up on a mountainside with His disciples and asked Philip where they could buy bread for them all." },
    { title: "A boy's lunch", ref: "John 6:6-9", art: "day:hills:bread,fish", text: "Andrew said, 'Here is a boy with five small barley loaves and two small fish, but how far will they go among so many?'" },
    { title: "Jesus gives thanks", ref: "John 6:10-11", art: "day:hills:bread", text: "Jesus told the people to sit down on the grass. He took the loaves, gave thanks, and distributed them. He did the same with the fish." },
    { title: "Enough and more", ref: "John 6:12-13", art: "dusk:hills:bread,basket", text: "Everyone ate as much as they wanted. Jesus told the disciples to gather the pieces so that nothing was wasted, and they filled twelve baskets." },
    { title: "The bread of life", ref: "John 6:14-15; John 6:35", art: "dawn:hills:bread", text: "The people said, 'Surely this is the Prophet who is to come.' Later Jesus told them, 'I am the bread of life. Whoever comes to me will never go hungry.'" },
  ],
  "lazarus": [
    { title: "A friend is sick", ref: "John 11:1-6", art: "day:city:family", text: "Mary and Martha sent word to Jesus: 'Lord, the one you love is sick.' Jesus loved Mary, Martha and Lazarus. He stayed where He was two more days." },
    { title: "Lazarus has died", ref: "John 11:7-16", art: "dusk:hills:road", text: "Jesus told the disciples Lazarus had died and said it was for God's glory, so that they would believe. They set out for Bethany." },
    { title: "I am the resurrection and the life", ref: "John 11:17-27", art: "day:city:tomb", text: "Martha met Jesus and said, 'If you had been here, my brother would not have died.' Jesus said, 'I am the resurrection and the life. Whoever believes in me will live, even though they die.'" },
    { title: "Jesus wept", ref: "John 11:28-37", art: "day:city:tomb", text: "When Jesus saw Mary and the others weeping, He was deeply moved and wept. Some said, 'See how he loved him!'" },
    { title: "Lazarus, come out!", ref: "John 11:38-44", art: "day:city:tomb", text: "At the tomb Jesus prayed and shouted, 'Lazarus, come out!' The dead man came out. Jesus said, 'Take off the grave clothes and let him go.'" },
  ],
};
