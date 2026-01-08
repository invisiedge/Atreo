import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiZap, FiLoader, FiBarChart2 } from 'react-icons/fi';
import { apiClient } from '../../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AdminAIFeatures() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your SUPER INTELLIGENT AI assistant for Atreo. I have COMPLETE ACCESS to your entire database with comprehensive knowledge of:

## Welcome to AI Intelligence

**Summary:** I'm equipped with deep knowledge of ALL your invoices, tools, financial data, analytics, and more. I can answer complex questions, provide trend analysis, identify patterns, and make intelligent recommendations.

### 🧠 My Capabilities
- **Complete Database Access:** ALL invoices, tools, users, employees, assets, domains, payments, organizations
- **Financial Intelligence:** Spending analysis, trends, top tools, invoice breakdowns, category analysis
- **Trend Analysis:** Monthly patterns, growth trends, spending forecasts
- **Pattern Recognition:** Identify anomalies, opportunities, and optimization areas
- **Comprehensive Analytics:** Dashboard statistics, tool inventory, invoice status, provider analysis

### 💡 Example Questions You Can Ask
- "What are our top 10 most expensive tools and their monthly costs?"
- "Show me invoice trends for the last 6 months"
- "Which provider has the highest total invoice amount?"
- "What's our total monthly recurring spend across all tools?"
- "Compare spending by category this month vs last month"
- "Which tools are we paying for but not actively using?"
- "What's the breakdown of invoice statuses and amounts?"
- "Show me all pending invoices and their total value"
- "What are the spending trends by organization?"
- "Analyze our tool usage and recommend cost optimizations"

### 🎯 Intelligence Features
- **Deep Analysis:** I analyze ALL your data, not just summaries
- **Trend Insights:** I identify patterns across time periods
- **Financial Intelligence:** I calculate complex metrics and projections
- **Actionable Recommendations:** I provide specific, data-driven suggestions

### Summary
I'm your intelligent data analyst. Ask me ANYTHING about your invoices, tools, spending, trends, or any aspect of your Atreo database, and I'll provide comprehensive, intelligent answers with detailed analysis.`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const answer = await apiClient.askAI(input.trim());
      const assistantMessage: Message = {
        role: 'assistant',
        content: answer,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message || 'Failed to get response'}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (loading) return;

    const insightsQuery = `Generate comprehensive AI insights about the entire Atreo database. Please provide:

## Database Overview
- Total counts for all entities (tools, users, employees, invoices, payments, organizations, customers)
- Overall system health and activity status

## Financial Insights
- Total spending across all categories
- Monthly recurring costs (MRC) from tools
- Average invoice amount
- Payment trends and patterns
- Top spending categories

## Tool Analytics
- Total tools (paid vs free)
- Most expensive tools
- Tool distribution by category
- Underutilized or duplicate tools
- Security risk assessment

## Employee & Workforce
- Total employees and contractors
- Average payment per employee
- Work fulfillment rates
- Top performing employees
- Departments or roles with highest costs

## Business Intelligence
- Month-over-month trends
- Seasonal patterns in spending
- Cost optimization opportunities
- Alerts for unusual spending patterns
- Recommendations for cost savings

Please format the response professionally with clear sections, bullet points, and key metrics highlighted.`;

    // Show a clean user message instead of the full query
    const userMessage: Message = {
      role: 'user',
      content: 'Generate comprehensive database insights',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const answer = await apiClient.askAI(insightsQuery);
      const assistantMessage: Message = {
        role: 'assistant',
        content: answer,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error generating insights: ${error.message || 'Failed to get response'}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const formatMessage = (content: string) => {
    // Split content into lines
    const lines = content.split('\n');
    const formatted: React.ReactElement[] = [];
    let inList = false;
    let listItems: React.ReactElement[] = [];
    let listType: 'ul' | 'ol' = 'ul';
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeaders: string[] = [];
    
    // Helper function to parse and render table
    const renderTable = () => {
      if (tableRows.length === 0 && tableHeaders.length === 0) return null;
      
      return (
        <div key={`table-${formatted.length}`} className="my-6 overflow-x-auto shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="min-w-full border-collapse">
            {tableHeaders.length > 0 && (
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 dark:from-blue-700 dark:via-blue-600 dark:to-purple-700">
                  {tableHeaders.map((header, idx) => (
                    <th
                      key={idx}
                      className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider shadow-sm first:rounded-tl-xl last:rounded-tr-xl"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-4 bg-white/30 rounded"></span>
                        {formatInlineMarkdown(header.trim())}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {tableRows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={`group hover:bg-blue-50 dark:hover:bg-gray-700/30 transition-all duration-200 ${
                    rowIdx % 2 === 0 
                      ? 'bg-white dark:bg-gray-800' 
                      : 'bg-gray-50/80 dark:bg-gray-800/60'
                  } ${rowIdx === tableRows.length - 1 ? 'last:rounded-b-xl' : ''}`}
                >
                  {row.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-200 border-r border-gray-100 dark:border-gray-700/50 last:border-r-0 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                    >
                      <div className="flex items-center">
                        {formatInlineMarkdown(cell.trim())}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };
    
    const processLine = (line: string, index: number) => {
      const trimmed = line.trim();
      
      // Check if line is a table row (contains |)
      const isTableRow = trimmed.includes('|') && trimmed.split('|').length > 2;
      const isTableSeparator = trimmed.match(/^\|[\s\-:]+\|/);
      
      if (isTableSeparator) {
        // This is a table separator, mark that we have headers
        if (tableRows.length > 0) {
          tableHeaders = tableRows[0];
          tableRows = tableRows.slice(1);
        }
        inTable = true;
        return;
      }
      
      if (isTableRow) {
        if (inList) {
          formatted.push(
            listType === 'ul' ? (
              <ul key={`list-${index}`} className="list-disc list-inside space-y-1 mb-3">
                {listItems}
              </ul>
            ) : (
              <ol key={`list-${index}`} className="list-decimal list-inside space-y-1 mb-3">
                {listItems}
              </ol>
            )
          );
          listItems = [];
          inList = false;
        }
        
        // Parse table row
        const cells = trimmed.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
        if (cells.length > 0) {
          tableRows.push(cells);
        }
        inTable = true;
        return;
      } else if (inTable) {
        // End of table, render it
        if (tableRows.length > 0 || tableHeaders.length > 0) {
          formatted.push(renderTable() as React.ReactElement);
        }
        tableRows = [];
        tableHeaders = [];
        inTable = false;
      }
      
      // Headers
      if (trimmed.startsWith('### ')) {
        if (inList) {
          formatted.push(
            listType === 'ul' ? (
              <ul key={`list-${index}`} className="list-disc list-inside space-y-1 mb-3">
                {listItems}
              </ul>
            ) : (
              <ol key={`list-${index}`} className="list-decimal list-inside space-y-1 mb-3">
                {listItems}
              </ol>
            )
          );
          listItems = [];
          inList = false;
        }
        const headerText = trimmed.replace('### ', '');
        formatted.push(
          <h4 key={index} className="text-base font-semibold text-foreground mt-4 mb-2.5 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary rounded"></span>
            {headerText}
          </h4>
        );
        return;
      } else if (trimmed.startsWith('## ')) {
        if (inList) {
          formatted.push(
            listType === 'ul' ? (
              <ul key={`list-${index}`} className="list-disc list-inside space-y-1 mb-3">
                {listItems}
              </ul>
            ) : (
              <ol key={`list-${index}`} className="list-decimal list-inside space-y-1 mb-3">
                {listItems}
              </ol>
            )
          );
          listItems = [];
          inList = false;
        }
        const headerText = trimmed.replace('## ', '');
        formatted.push(
          <h3 key={index} className="text-lg font-semibold text-foreground mt-5 mb-3 pb-2 border-b border-gray-200">
            {headerText}
          </h3>
        );
        return;
      } else if (trimmed.startsWith('# ')) {
        if (inList) {
          formatted.push(
            listType === 'ul' ? (
              <ul key={`list-${index}`} className="list-disc list-inside space-y-1 mb-3">
                {listItems}
              </ul>
            ) : (
              <ol key={`list-${index}`} className="list-decimal list-inside space-y-1 mb-3">
                {listItems}
              </ol>
            )
          );
          listItems = [];
          inList = false;
        }
        const headerText = trimmed.replace('# ', '');
        formatted.push(
          <h2 key={index} className="text-xl font-bold text-foreground mt-6 mb-4 pb-2 border-b-2 border-blue-600">
            {headerText}
          </h2>
        );
        return;
      }
      
      // Code blocks
      if (trimmed.startsWith('```')) {
        if (inList) {
          formatted.push(
            listType === 'ul' ? (
              <ul key={`list-${index}`} className="list-disc list-inside space-y-1 mb-3">
                {listItems}
              </ul>
            ) : (
              <ol key={`list-${index}`} className="list-decimal list-inside space-y-1 mb-3">
                {listItems}
              </ol>
            )
          );
          listItems = [];
          inList = false;
        }
        return; // Skip code block markers for now
      }
      
      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList || listType !== 'ul') {
          if (inList && listType === 'ol') {
            formatted.push(
              <ol key={`list-${index}`} className="list-decimal list-inside space-y-1 mb-3">
                {listItems}
              </ol>
            );
            listItems = [];
          }
          inList = true;
          listType = 'ul';
        }
        const itemContent = formatInlineMarkdown(trimmed.substring(2));
        listItems.push(
          <li key={`ul-${index}`} className="text-gray-700 py-0.5">
            {itemContent}
          </li>
        );
        return;
      }
      
      // Numbered lists
      if (/^\d+\.\s/.test(trimmed)) {
        if (!inList || listType !== 'ol') {
          if (inList && listType === 'ul') {
            formatted.push(
              <ul key={`list-${index}`} className="list-disc list-inside space-y-1 mb-3">
                {listItems}
              </ul>
            );
            listItems = [];
          }
          inList = true;
          listType = 'ol';
        }
        const itemContent = formatInlineMarkdown(trimmed.replace(/^\d+\.\s/, ''));
        listItems.push(
          <li key={`ol-${index}`} className="text-gray-700 py-0.5">
            {itemContent}
          </li>
        );
        return;
      }
      
      // End list if we hit a non-list line
      if (inList && trimmed) {
        formatted.push(
          listType === 'ul' ? (
            <ul key={`list-${index}`} className="list-disc list-inside space-y-1 mb-3">
              {listItems}
            </ul>
          ) : (
            <ol key={`list-${index}`} className="list-decimal list-inside space-y-1 mb-3">
              {listItems}
            </ol>
          )
        );
        listItems = [];
        inList = false;
      }
      
      // Regular paragraphs - check for Summary format
      if (trimmed) {
        if (trimmed.startsWith('**Summary:**')) {
          formatted.push(
            <p key={index} className="text-foreground font-medium mb-2 leading-relaxed">
              {formatInlineMarkdown(trimmed)}
            </p>
          );
        } else {
          formatted.push(
            <p key={index} className="text-gray-700 mb-2 leading-relaxed">
              {formatInlineMarkdown(trimmed)}
            </p>
          );
        }
      } else if (!inList) {
        formatted.push(<br key={index} />);
      }
    };
    
    // Process all lines
    lines.forEach((line, index) => processLine(line, index));
    
    // Close any remaining table
    if (inTable && (tableRows.length > 0 || tableHeaders.length > 0)) {
      const tableElement = renderTable();
      if (tableElement) {
        formatted.push(tableElement as React.ReactElement);
      }
    }
    
    // Close any remaining list
    if (inList && listItems.length > 0) {
      formatted.push(
        listType === 'ul' ? (
          <ul key="list-final" className="list-disc list-inside space-y-1 mb-3">
            {listItems}
          </ul>
        ) : (
          <ol key="list-final" className="list-decimal list-inside space-y-1 mb-3">
            {listItems}
          </ol>
        )
      );
    }
    
    return formatted;
  };
  
  const formatInlineMarkdown = (text: string): (string | React.ReactElement)[] => {
    const parts: (string | React.ReactElement)[] = [];
    let keyCounter = 0;
    
    // Handle bold text **text**
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText) {
          parts.push(beforeText);
        }
      }
      // Add bold text
      parts.push(
        <strong key={`bold-${keyCounter++}`} className="font-semibold text-foreground">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    // If no bold found, return original text
    if (parts.length === 0) {
      return [text];
    }
    
    // Process inline code `code`
    const processedParts: (string | React.ReactElement)[] = [];
    parts.forEach((part) => {
      if (typeof part === 'string') {
        const codeRegex = /`([^`]+)`/g;
        let codeLastIndex = 0;
        let codeMatch;
        let hasCode = false;
        
        while ((codeMatch = codeRegex.exec(part)) !== null) {
          hasCode = true;
          // Add text before code
          if (codeMatch.index > codeLastIndex) {
            processedParts.push(part.substring(codeLastIndex, codeMatch.index));
          }
          // Add code
          processedParts.push(
            <code key={`code-${keyCounter++}`} className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
              {codeMatch[1]}
            </code>
          );
          codeLastIndex = codeMatch.index + codeMatch[0].length;
        }
        
        if (hasCode) {
          // Add remaining text
          if (codeLastIndex < part.length) {
            processedParts.push(part.substring(codeLastIndex));
          }
        } else {
          processedParts.push(part);
        }
      } else {
        processedParts.push(part);
      }
    });
    
    return processedParts.length > 0 ? processedParts : [text];
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
              <FiZap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">AI Assistant</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ask me anything about your database - tools, users, employees, invoices, and more
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateInsights}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiBarChart2 className="h-4 w-4 mr-2" />
            Generate Insights
          </button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-card rounded-lg border border-border shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg px-5 py-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-foreground border border-border shadow-sm'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="text-sm space-y-1">
                    {formatMessage(message.content)}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
                <p className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-background border border-border rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <FiLoader className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4 bg-gray-50 dark:bg-gray-900">
          <form onSubmit={handleSend} className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your database..."
              className="flex-1 px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white dark:bg-gray-900"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              <FiSend className="h-5 w-5" />
              <span className="font-medium">Send</span>
            </button>
          </form>
          
          {/* Example Questions */}
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleGenerateInsights}
                disabled={loading}
                className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 border border-purple-300 dark:border-purple-700 rounded-lg hover:from-purple-200 hover:to-blue-200 dark:hover:from-purple-800 dark:hover:to-blue-800 transition-colors disabled:opacity-50 text-purple-800 dark:text-purple-200 font-medium"
              >
                <FiBarChart2 className="inline h-3 w-3 mr-1" />
                Generate Database Insights
              </button>
              {[
                'What are all the tools we have?',
                'How many users are there?',
                'What is our monthly tools spend?',
                'Show me all paid tools',
                'How many invoices are pending?'
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => setInput(example)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 text-gray-700"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

