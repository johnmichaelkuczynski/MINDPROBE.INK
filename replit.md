# Overview

Mind Reader is a cognitive/psychological/psychopathological profiler application that provides six distinct analysis types: cognitive, comprehensive cognitive, psychological, comprehensive psychological, psychopathological, and comprehensive psychopathological. The application functions as a passthrough system that relays user input to LLM services and returns unfiltered responses for professional assessment purposes.

## Recent Changes

### October 1, 2025 - Authentication & Payment System
- ✓ **Phase 1**: Implemented PostgreSQL database with user authentication (username/password)
- ✓ **Phase 2**: Added optional login system - site remains fully accessible without authentication
- ✓ **Phase 3**: Complete Stripe payment integration with credit system
  - Payment intent creation with automatic payment methods
  - Webhook handler with signature verification for production
  - Payment verification endpoint as fallback for test/development environments
  - Idempotency protection via unique constraint on payment intent IDs
  - Conditional credit addition prevents duplicate crediting
  - Comprehensive error handling and user feedback (processing/success/failed/error states)
  - **Buy Credits button visible to all users** - redirects to login with checkout redirect for non-authenticated users
- ✓ Analysis results now optionally associate with logged-in user accounts
- ✓ **PRODUCTION READY**: All security measures, idempotency protection, and error handling verified

### August 27, 2025
- ✓ Updated analysis engine to send complete instruction text with every LLM request
- ✓ Implemented revised intelligence protocol with updated scoring methodology
- ✓ Added paradigm example of phony pseudo-intellectual text for LLM reference
- ✓ Fixed PDF upload functionality with proper text extraction
- ✓ Enhanced scoring calibration: scores represent outperformance (XX/100 = author outperforms XX people)
- ✓ Removed all formatting markup from LLM outputs for clean plain text responses
- ✓ **VERIFIED WORKING**: System successfully processing analyses with revised protocol
- ✓ Real-time streaming confirmed functional with proper SSE connections
- ✓ Added "New Analysis" button for easy reset functionality
- ✓ **OUTSTANDING PERFORMANCE**: LLM properly identifying and analyzing pseudo-intellectual text with sophisticated evaluation
- ✓ Added drag and drop functionality to text input area with visual feedback
- ✓ **APPLICATION FULLY FUNCTIONAL**: User confirmed excellent performance with all features working properly

# User Preferences

Preferred communication style: Simple, everyday language.
User satisfaction: Extremely high - "EXCELLENT. THE APP WORKS WELL!"

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: Server-Sent Events (SSE) for streaming analysis results

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with local strategy (username/password), session-based with PostgreSQL store
- **Payment Processing**: Stripe integration with PaymentIntents API
- **File Processing**: Multer for file uploads with support for PDF, Word, and text files
- **Analysis Engine**: Custom service that processes questions in batches of 5 to avoid token limits
- **Storage**: Database-backed storage with user accounts, credit purchases, and analysis history

## Core Services
- **LLM Service**: Abstraction layer supporting multiple AI providers (OpenAI, Anthropic, DeepSeek, Perplexity) referenced as ZHI 1-4
- **File Processor**: Handles text extraction from uploaded documents using pdf-parse and mammoth libraries
- **Analysis Engine**: Manages question sets and coordinates streaming responses for real-time feedback

## Data Flow Design
- **Input Processing**: Supports both text input and file uploads with validation
- **Batch Processing**: Questions sent to LLMs in groups of 5 with 10-second delays between batches
- **Real-time Streaming**: Responses displayed immediately as they arrive via SSE
- **Dialogue System**: Post-analysis conversation capability with regeneration options based on user feedback

## Security and Validation
- **Authentication**: Scrypt password hashing, session-based authentication with secure cookie settings
- **Payment Security**: Stripe webhook signature verification, payment intent ownership validation
- **Idempotency Protection**: Unique constraint on payment intent IDs, conditional credit addition
- **File Upload Restrictions**: 10MB limit with MIME type and extension validation
- **Input Validation**: Zod schemas for all data structures
- **Error Handling**: Comprehensive error boundaries and user feedback mechanisms

## Payment System
- **Credit-based Model**: Users purchase credits to run analyses
- **Stripe Integration**: 
  - PaymentIntents API with automatic payment methods
  - Webhook endpoint for production (signature verified)
  - Verification endpoint for test/development environments (Stripe API retrieval)
  - Dual-path processing ensures credits are added even when webhooks fail
- **Idempotency**: Prevents duplicate crediting via unique database constraints and boolean return checks
- **User Experience**: Processing/success/failed/error states with clear feedback and retry options

# External Dependencies

## AI/LLM Services
- **OpenAI API**: Primary analysis engine (referenced as ZHI 1)
- **Anthropic Claude**: Alternative reasoning model (referenced as ZHI 2) using claude-sonnet-4-20250514
- **DeepSeek**: Specialized profiling engine (referenced as ZHI 3)
- **Perplexity**: Research-focused model (referenced as ZHI 4)

## Database and Storage
- **PostgreSQL**: Primary data storage via Neon Database serverless
- **Drizzle ORM**: Type-safe database operations and migrations

## File Processing Libraries
- **pdf-parse**: PDF text extraction
- **mammoth**: Microsoft Word document processing
- **multer**: File upload handling

## Development and Build Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type safety across the entire stack
- **ESBuild**: Backend bundling for production
- **Replit**: Development environment with specific plugins for cartographer and error handling