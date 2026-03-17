const Service = require('../../server/models/Service');
const Product = require('../../server/models/Product');

/**
 * Simple rule-based chatbot for salon customer queries.
 * Can be extended with NLP or LLM integration.
 */
class SalonChatbot {
  constructor() {
    this.intents = [
      { patterns: ['price', 'cost', 'how much', 'rate', 'charge', 'fee'], handler: this.handlePricing },
      { patterns: ['book', 'appointment', 'schedule', 'reserve', 'slot'], handler: this.handleBooking },
      { patterns: ['timing', 'hours', 'open', 'close', 'when'], handler: this.handleTimings },
      { patterns: ['service', 'offer', 'treatment', 'what do you'], handler: this.handleServices },
      { patterns: ['product', 'buy', 'shampoo', 'serum', 'cream'], handler: this.handleProducts },
      { patterns: ['course', 'academy', 'learn', 'training', 'class'], handler: this.handleAcademy },
      { patterns: ['location', 'address', 'where', 'direction'], handler: this.handleLocation },
      { patterns: ['hi', 'hello', 'hey', 'good morning', 'good evening'], handler: this.handleGreeting },
      { patterns: ['thanks', 'thank you', 'bye', 'ok'], handler: this.handleGoodbye },
    ];
  }

  async processMessage(message) {
    const lower = message.toLowerCase().trim();
    for (const intent of this.intents) {
      if (intent.patterns.some(p => lower.includes(p))) {
        return await intent.handler.call(this, lower);
      }
    }
    return {
      text: "I'm not sure I understand. You can ask me about:\n• Service prices\n• Booking appointments\n• Our timings\n• Available services & products\n• Academy courses",
      suggestions: ['Show services', 'Book appointment', 'Timings', 'Academy courses']
    };
  }

  handleGreeting() {
    return {
      text: "Welcome to Galaxy Unisex Saloon & Beauty Academy! 💇‍♀️✨\nHow can I help you today?",
      suggestions: ['Show services', 'Book appointment', 'Timings', 'Prices']
    };
  }

  handleGoodbye() {
    return { text: "Thank you for reaching out! Have a great day! 😊" };
  }

  async handlePricing(msg) {
    const services = await Service.find({ isActive: true }).select('name price category').lean();
    if (services.length === 0) return { text: "Please visit us or call for current pricing." };

    // Try to match specific service
    const matched = services.find(s => msg.includes(s.name.toLowerCase()));
    if (matched) {
      return { text: `${matched.name}: ₹${matched.price}\nCategory: ${matched.category}` };
    }

    const grouped = {};
    services.forEach(s => {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(`${s.name} - ₹${s.price}`);
    });

    let text = "Here are our service prices:\n\n";
    Object.entries(grouped).forEach(([cat, items]) => {
      text += `*${cat}*\n${items.join('\n')}\n\n`;
    });

    return { text, suggestions: ['Book appointment'] };
  }

  handleBooking() {
    return {
      text: "To book an appointment:\n1. Visit our salon\n2. Call us\n3. Use our booking page on the website\n\nWe'll confirm your slot and send a reminder!",
      suggestions: ['Show services', 'Timings']
    };
  }

  handleTimings() {
    return {
      text: "🕐 Our Timings:\n• Monday - Saturday: 10:00 AM - 8:00 PM\n• Sunday: 10:00 AM - 6:00 PM\n\nWe recommend booking an appointment for peak hours!",
      suggestions: ['Book appointment', 'Location']
    };
  }

  async handleServices() {
    const services = await Service.find({ isActive: true }).select('name category').lean();
    const categories = [...new Set(services.map(s => s.category))];
    return {
      text: `We offer services in ${categories.length} categories:\n${categories.map(c => `• ${c} (${services.filter(s => s.category === c).length} services)`).join('\n')}\n\nAsk me about pricing for details!`,
      suggestions: ['Prices', 'Book appointment']
    };
  }

  async handleProducts() {
    const products = await Product.find({ isActive: true, stock: { $gt: 0 } })
      .select('name sellingPrice category').limit(10).lean();
    if (products.length === 0) return { text: "Visit our salon to check available products!" };

    const list = products.map(p => `• ${p.name} - ₹${p.sellingPrice}`).join('\n');
    return { text: `Available products:\n${list}\n\nVisit us to purchase!`, suggestions: ['Services', 'Prices'] };
  }

  handleAcademy() {
    return {
      text: "🎓 Galaxy Beauty Academy offers professional courses:\n• Hair Styling & Cutting\n• Advanced Makeup Artistry\n• Nail Art & Extension\n• Skin Care & Facial Treatments\n\nEnroll now and start your beauty career! Contact us for details.",
      suggestions: ['Timings', 'Location']
    };
  }

  handleLocation() {
    return {
      text: "📍 Galaxy Unisex Saloon & Beauty Academy\nVisit us at our salon. Contact us for exact directions!",
      suggestions: ['Timings', 'Services']
    };
  }
}

module.exports = SalonChatbot;
