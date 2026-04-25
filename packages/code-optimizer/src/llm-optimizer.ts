import { ICodeOptimizer, OptimizedCode, Transformation, OptimizationOptions, OptimizationMetrics } from './interfaces';

/**
 * LLM-based code optimizer that uses large language models to provide
 * sophisticated code refactorings and optimizations.
 */
export class LLMOptimizer implements ICodeOptimizer {
  private apiKey: string;
  private model: string;
  private provider: 'openai' | 'anthropic' | 'google';
  private baseUrl: string;

  constructor(options: {
    apiKey: string;
    model?: string;
    provider?: 'openai' | 'anthropic' | 'google';
    baseUrl?: string;
  }) {
    this.apiKey = options.apiKey;
    this.provider = options.provider || 'openai';
    
    if (this.provider === 'anthropic') {
      this.model = options.model || 'claude-3-5-sonnet-20241022';
      this.baseUrl = options.baseUrl || 'https://api.anthropic.com/v1/messages';
    } else if (this.provider === 'google') {
      this.model = options.model || 'gemini-flash-latest';
      this.baseUrl = options.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';
    } else {
      this.model = options.model || 'gpt-4';
      this.baseUrl = options.baseUrl || 'https://api.openai.com/v1/chat/completions';
    }
  }

  async optimize(
    code: string,
    language: string,
    options?: OptimizationOptions
  ): Promise<OptimizedCode> {
    const startTime = Date.now();
    const transformations: Transformation[] = [];

    try {
      const optimizedCode = await this.requestLLMOptimization(code, language, options);
      
      // Calculate metrics
      const metrics = this.calculateMetrics(code, optimizedCode, startTime);
      
      // Add transformation
      transformations.push({
        type: 'llm-optimization',
        description: 'LLM-based code optimization',
        range: { start: 0, end: code.length },
        confidence: 0.9
      });

      return {
        code: optimizedCode,
        transformations,
        metrics,
        explanation: 'Code optimized using LLM-based analysis'
      };
    } catch (error) {
      console.error('LLM optimization failed:', error);
      
      // Return original code if LLM fails
      return {
        code,
        transformations: [],
        metrics: {
          originalSize: code.length,
          optimizedSize: code.length,
          complexityReduction: 0
        },
        explanation: 'LLM optimization failed, returning original code'
      };
    }
  }

  private async requestLLMOptimization(
    code: string,
    language: string,
    options?: OptimizationOptions
  ): Promise<string> {
    const prompt = this.buildPrompt(code, language, options);
    
    let url = this.baseUrl;
    if (this.provider === 'google') {
      url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.getRequestBody(prompt))
    });

    if (!response.ok) {
      throw new Error(`LLM API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return this.extractOptimizedCode(data);
  }

  private buildPrompt(code: string, language: string, options?: OptimizationOptions): string {
    const optimizationGoals = this.getOptimizationGoals(options);
    
    return `You are a code optimization expert. Please optimize the following ${language} code.

${optimizationGoals}

Original code:
\`\`\`${language}
${code}
\`\`\`

Return ONLY the optimized code, with no additional text, explanations, or markdown formatting. The response should be pure code that can be directly executed.`;
  }

  private getOptimizationGoals(options?: OptimizationOptions): string {
    const goals: string[] = [];
    
    if (options?.optimizations?.imports) {
      goals.push('- Remove unused imports');
      goals.push('- Organize imports logically');
    }
    
    if (options?.optimizations?.simplification) {
      goals.push('- Simplify complex expressions');
      goals.push('- Use more Pythonic constructs');
      goals.push('- Reduce code duplication');
    }
    
    if (options?.optimizations?.complexity) {
      goals.push('- Reduce cyclomatic complexity');
      goals.push('- Extract functions/methods where appropriate');
      goals.push('- Improve code structure');
    }
    
    if (options?.optimizations?.reusability) {
      goals.push('- Improve function modularity');
      goals.push('- Add docstrings where appropriate');
      goals.push('- Improve variable naming');
    }
    
    if (goals.length === 0) {
      goals.push('- Optimize for readability and maintainability');
      goals.push('- Remove unnecessary code');
      goals.push('- Improve code structure');
    }
    
    return `Optimization goals:\n${goals.join('\n')}\n\nImportant: Preserve the original functionality of the code.`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.provider === 'anthropic') {
      headers['x-api-key'] = this.apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else if (this.provider === 'google') {
      headers['X-goog-api-key'] = this.apiKey;
    } else {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private getRequestBody(prompt: string): object {
    if (this.provider === 'google') {
      return {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      };
    } else if (this.provider === 'anthropic') {
      return {
        model: this.model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      };
    } else {
      return {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4096,
        temperature: 0.3
      };
    }
  }

  private extractOptimizedCode(data: any): string {
    let content: string;
    
    if (this.provider === 'google') {
      content = data.candidates[0].content.parts[0].text;
    } else if (this.provider === 'anthropic') {
      content = data.content[0].text;
    } else {
      content = data.choices[0].message.content;
    }

    // Remove markdown code blocks if present
    content = content.replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
    });

    return content.trim();
  }

  private calculateMetrics(originalCode: string, optimizedCode: string, startTime: number): OptimizationMetrics {
    const originalSize = originalCode.length;
    const optimizedSize = optimizedCode.length;
    
    // Simple complexity reduction estimation based on line count
    const originalLines = originalCode.split('\n').length;
    const optimizedLines = optimizedCode.split('\n').length;
    const complexityReduction = originalLines > 0 ? (originalLines - optimizedLines) / originalLines : 0;

    return {
      originalSize,
      optimizedSize,
      complexityReduction: Math.max(0, complexityReduction)
    };
  }
}
