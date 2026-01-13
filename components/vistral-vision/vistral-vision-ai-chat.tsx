"use client";

import { useState, useRef, useEffect } from "react";
import { Property } from "@/lib/property-storage";
import { X, Send, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VistralVisionAIChatProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function VistralVisionAIChat({ isOpen, onOpenChange, properties }: VistralVisionAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your AI assistant for Vistral Vision. I can help you with questions about your properties, transactions, rentals, sales, financials, and more. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Property-related queries
    if (lowerMessage.includes("property") || lowerMessage.includes("properties")) {
      const totalProperties = properties.length;
      const soldProperties = properties.filter(p => p.currentStage === "sold").length;
      const totalValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);
      const inPipeline = properties.filter(p => !["sold", "rejected"].includes(p.currentStage)).length;
      
      if (lowerMessage.includes("how many") || lowerMessage.includes("count")) {
        return `You currently have **${totalProperties} properties** in your portfolio:\n\n✅ **${soldProperties}** sold\n🔄 **${inPipeline}** in pipeline\n📊 Conversion rate: ${((soldProperties / totalProperties) * 100).toFixed(1)}%\n\nWould you like details about any specific stage?`;
      }
      if (lowerMessage.includes("value") || lowerMessage.includes("worth")) {
        const avgValue = totalProperties > 0 ? totalValue / totalProperties : 0;
        return `**Portfolio Valuation:**\n\n💰 Total Value: **€${(totalValue / 1000000).toFixed(2)}M**\n📈 Average Property Value: **€${(avgValue / 1000).toFixed(0)}K**\n🏆 Highest Value: **€${Math.max(...properties.map(p => p.price || 0)) / 1000}K**\n\nYour portfolio shows strong growth potential!`;
      }
      if (lowerMessage.includes("sold")) {
        return `**Sales Performance:**\n\n✅ Sold Properties: **${soldProperties}**\n📊 Conversion Rate: **${((soldProperties / totalProperties) * 100).toFixed(1)}%**\n💰 Total Sales Value: **€${(properties.filter(p => p.currentStage === "sold").reduce((sum, p) => sum + (p.price || 0), 0) / 1000000).toFixed(2)}M**\n\nGreat performance! 🎉`;
      }
      if (lowerMessage.includes("pipeline") || lowerMessage.includes("stages")) {
        const stages = {
          new: properties.filter(p => p.currentStage === "draft").length,
          evaluation: properties.filter(p => p.currentStage === "review" || p.currentStage === "needs-correction").length,
          negotiation: properties.filter(p => p.currentStage === "negotiation").length,
          contract: properties.filter(p => p.currentStage === "pending-arras").length,
          renovation: properties.filter(p => p.currentStage === "settlement").length,
        };
        return `**Pipeline Breakdown:**\n\n🆕 New: **${stages.new}**\n🔍 Evaluation: **${stages.evaluation}**\n🤝 Negotiation: **${stages.negotiation}**\n📝 Contract: **${stages.contract}**\n🔨 Renovation: **${stages.renovation}**\n\nTotal in pipeline: **${inPipeline}** properties`;
      }
    }
    
    // Financial queries
    if (lowerMessage.includes("revenue") || lowerMessage.includes("profit") || lowerMessage.includes("financial")) {
      const totalValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);
      const soldValue = properties.filter(p => p.currentStage === "sold").reduce((sum, p) => sum + (p.price || 0), 0);
      return `**Financial Overview:**\n\n💰 Total Portfolio Value: **€${(totalValue / 1000000).toFixed(2)}M**\n💵 Sales Revenue: **€${(soldValue / 1000000).toFixed(2)}M**\n📊 Average Property Value: **€${(totalValue / properties.length / 1000).toFixed(0)}K**\n✅ Properties Sold: **${properties.filter(p => p.currentStage === "sold").length}**\n📈 Growth Rate: **+18.5%**\n\nYour financials are looking strong! 💪`;
    }
    
    // Sales queries
    if (lowerMessage.includes("sales") || lowerMessage.includes("leads")) {
      return `**Sales Pipeline Insights:**\n\n📊 **Active Leads:** 12 leads across all stages\n💰 **Pipeline Value:** €2.4M\n🎯 **Conversion Rate:** 24.5%\n🔥 **Hot Leads:** 3 in negotiation stage\n\nTop performing sources:\n1. Website (45%)\n2. Referrals (30%)\n3. Social Media (25%)\n\nWould you like details about any specific lead stage?`;
    }
    
    // Rental queries
    if (lowerMessage.includes("rental") || lowerMessage.includes("rent") || lowerMessage.includes("tenant")) {
      return `**Rental Portfolio:**\n\n🏠 **Active Rentals:** 8 properties\n💰 **Monthly Revenue:** €15,450/month\n📊 **Occupancy Rate:** 80%\n⚠️ **Overdue Payments:** 2 tenants\n🔧 **Maintenance Requests:** 6 active\n\nTop performing areas:\n- Barcelona: €8,200/month\n- Madrid: €7,250/month\n\nNeed help with any specific rental issue?`;
    }
    
    // Transaction queries
    if (lowerMessage.includes("transaction") || lowerMessage.includes("deal")) {
      return `**Transaction Pipeline:**\n\n📋 **Active Transactions:** 10 deals\n💰 **Total Value:** €4.2M\n⏳ **In Closing:** 2 transactions\n✅ **Completed This Month:** 1 deal\n\nCurrent stages:\n- Initiated: 2\n- Negotiation: 3\n- Contract: 2\n- Closing: 2\n- Completed: 1\n\nAll transactions are progressing well! 🚀`;
    }
    
    // People queries
    if (lowerMessage.includes("team") || lowerMessage.includes("people") || lowerMessage.includes("employee")) {
      return `**Team Overview:**\n\n👥 **Total Employees:** 10\n✅ **Active:** 9 employees\n📊 **Avg Performance:** 89.2%\n🏠 **Properties Assigned:** 84 total\n\nTop performers:\n1. María García - 95% (12 properties)\n2. Roberto Silva - 94% (18 properties)\n3. Ana López - 92% (5 properties)\n\nYour team is performing excellently! 🌟`;
    }
    
    // Documents queries
    if (lowerMessage.includes("document") || lowerMessage.includes("compliance")) {
      return `**Document & Compliance Status:**\n\n📄 **Total Documents:** 8\n✅ **Valid:** 5 documents\n⚠️ **Expiring Soon:** 2 documents\n❌ **Expired:** 1 document\n\n**Compliance:**\n✅ Compliant: 5/8 items\n⚠️ Non-compliant: 2 items\n⏳ Pending: 1 item\n\nAction needed: Renew 1 expired rental license`;
    }
    
    // AI queries
    if (lowerMessage.includes("ai") || lowerMessage.includes("workflow") || lowerMessage.includes("automation")) {
      return `**AI Integrations:**\n\n🤖 **Active Workflows:** 7 AI-powered automations\n⏱️ **Time Saved:** 52 hours/week\n📊 **Properties Affected:** 990 total\n\nTop workflows:\n1. Smart Lead Scoring - 12 hrs/week saved\n2. Automated Contract Generation - 10 hrs/week\n3. Document Auto-Classification - 6 hrs/week\n\nYour AI integrations are saving significant time! ⚡`;
    }
    
    // General help
    if (lowerMessage.includes("help") || lowerMessage.includes("what can you") || lowerMessage.includes("capabilities")) {
      return `**I can help you with:**\n\n📊 **Properties**: Count, value, status, pipeline stages\n💰 **Financials**: Revenue, profit, analytics, growth\n🏠 **Rentals**: Active rentals, tenants, revenue, occupancy\n💼 **Sales**: Leads, pipeline, conversions, sources\n📄 **Transactions**: Deals, contracts, closings, stages\n👥 **People**: Team, assignments, performance, departments\n📋 **Documents**: Compliance, expiring docs, renewals\n🤖 **AI**: Workflows, automation, time savings\n\n**Try asking:**\n- "How many properties do I have?"\n- "What's my revenue?"\n- "Show me rental statistics"\n- "Tell me about my team"\n\nJust ask me anything about your business! 💬`;
    }
    
    // Performance queries
    if (lowerMessage.includes("performance") || lowerMessage.includes("metrics") || lowerMessage.includes("kpi")) {
      return `**Key Performance Indicators:**\n\n📊 **Portfolio Metrics:**\n- Total Properties: ${properties.length}\n- Sold: ${properties.filter(p => p.currentStage === "sold").length}\n- Conversion Rate: ${((properties.filter(p => p.currentStage === "sold").length / properties.length) * 100).toFixed(1)}%\n\n💰 **Financial KPIs:**\n- Total Value: €${(properties.reduce((sum, p) => sum + (p.price || 0), 0) / 1000000).toFixed(2)}M\n- Revenue Growth: +18.5%\n- Profit Margin: 65.3%\n\n🏆 **Operational KPIs:**\n- Avg Days to Close: 42 days\n- Customer Satisfaction: 4.8/5\n- Team Performance: 89.2%\n\nAll metrics are trending upward! 📈`;
    }
    
    // Default response
    return `I understand you're asking about **"${userMessage}"**. Based on your Vistral Vision data:\n\n📊 **Quick Overview:**\n- **${properties.length}** properties in portfolio\n- **${properties.filter(p => p.currentStage === "sold").length}** sold\n- **€${(properties.reduce((sum, p) => sum + (p.price || 0), 0) / 1000000).toFixed(2)}M** total value\n\n**I can help with:**\n- Properties & pipeline\n- Financials & revenue\n- Sales & leads\n- Rentals & tenants\n- Transactions & deals\n- Team & performance\n- Documents & compliance\n- AI workflows\n\nCould you be more specific? For example:\n- "How many properties do I have?"\n- "What's my revenue?"\n- "Show me rental stats"`;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI processing
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateAIResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[var(--prophero-blue-500)] hover:bg-[var(--prophero-blue-600)] text-white shadow-lg flex items-center justify-center transition-colors z-50"
        aria-label="Open AI Chat"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-card dark:bg-[var(--prophero-gray-900)] border border-border rounded-lg shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
          <h3 className="font-semibold text-foreground">AI Assistant</h3>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="p-1 rounded hover:bg-accent transition-colors"
          aria-label="Close chat"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="h-8 w-8 rounded-full bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)] flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2",
                message.role === "user"
                  ? "bg-[var(--prophero-blue-500)] text-white"
                  : "bg-accent dark:bg-[var(--prophero-gray-800)] text-foreground"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.role === "user" && (
              <div className="h-8 w-8 rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-foreground">U</span>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="h-8 w-8 rounded-full bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)] flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
            </div>
            <div className="bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your business..."
            className="flex-1 px-4 py-2 rounded-lg border border-input bg-background dark:bg-[var(--prophero-gray-900)] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[var(--prophero-blue-500)]"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-[var(--prophero-blue-500)] hover:bg-[var(--prophero-blue-600)] text-white"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

