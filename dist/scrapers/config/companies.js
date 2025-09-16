"use strict";
// ✅ Company Configuration for Ashby and Other Scrapers
Object.defineProperty(exports, "__esModule", { value: true });
exports.EARLY_CAREER_FRIENDLY_INDUSTRIES = exports.COMPANY_SIZES = exports.TARGET_COMPANIES = exports.ASHBY_COMPANIES = void 0;
exports.ASHBY_COMPANIES = [
    {
        name: 'Stripe',
        boardId: 'stripe',
        priority: 'high',
        euOffices: ['Dublin', 'London', 'Amsterdam', 'Berlin'],
        categories: ['fintech', 'payments'],
        description: 'Global payment processing platform'
    },
    {
        name: 'Notion',
        boardId: 'notion',
        priority: 'high',
        euOffices: ['Dublin', 'London'],
        categories: ['productivity', 'collaboration'],
        description: 'All-in-one workspace for notes, docs, and wikis'
    },
    {
        name: 'Linear',
        boardId: 'linear',
        priority: 'medium',
        euOffices: ['Remote'],
        categories: ['productivity', 'project-management'],
        description: 'Issue tracking and project management tool'
    },
    {
        name: 'Loom',
        boardId: 'loom',
        priority: 'medium',
        euOffices: ['London', 'Dublin'],
        categories: ['video', 'communication'],
        description: 'Video messaging platform'
    },
    {
        name: 'Revolut',
        boardId: 'revolut',
        priority: 'high',
        euOffices: ['London', 'Berlin', 'Amsterdam', 'Dublin'],
        categories: ['fintech', 'banking'],
        description: 'Digital banking and financial services'
    },
    {
        name: 'Monzo',
        boardId: 'monzo',
        priority: 'high',
        euOffices: ['London', 'Dublin'],
        categories: ['fintech', 'banking'],
        description: 'Digital bank and financial services'
    },
    {
        name: 'N26',
        boardId: 'n26',
        priority: 'high',
        euOffices: ['Berlin', 'Barcelona', 'Vienna'],
        categories: ['fintech', 'banking'],
        description: 'Mobile banking platform'
    },
    {
        name: 'Klarna',
        boardId: 'klarna',
        priority: 'high',
        euOffices: ['Stockholm', 'Berlin', 'Amsterdam'],
        categories: ['fintech', 'payments'],
        description: 'Buy now, pay later payment solutions'
    },
    {
        name: 'Spotify',
        boardId: 'spotify',
        priority: 'high',
        euOffices: ['Stockholm', 'London', 'Amsterdam', 'Berlin'],
        categories: ['music', 'streaming', 'entertainment'],
        description: 'Music streaming platform'
    },
    {
        name: 'Figma',
        boardId: 'figma',
        priority: 'medium',
        euOffices: ['London', 'Amsterdam'],
        categories: ['design', 'collaboration'],
        description: 'Collaborative design platform'
    },
    {
        name: 'Canva',
        boardId: 'canva',
        priority: 'medium',
        euOffices: ['Dublin'],
        categories: ['design', 'creativity'],
        description: 'Graphic design platform'
    },
    {
        name: 'GitLab',
        boardId: 'gitlab',
        priority: 'high',
        euOffices: ['Remote'],
        categories: ['devops', 'development'],
        description: 'DevOps platform and Git repository manager'
    },
    {
        name: 'Buffer',
        boardId: 'buffer',
        priority: 'medium',
        euOffices: ['Remote'],
        categories: ['social-media', 'marketing'],
        description: 'Social media management platform'
    },
    {
        name: 'Zapier',
        boardId: 'zapier',
        priority: 'medium',
        euOffices: ['Remote'],
        categories: ['automation', 'productivity'],
        description: 'Workflow automation platform'
    },
    {
        name: 'Doist',
        boardId: 'doist',
        priority: 'low',
        euOffices: ['Remote'],
        categories: ['productivity', 'task-management'],
        description: 'Productivity and task management tools'
    }
];
// Additional companies that might use other ATS systems
exports.TARGET_COMPANIES = [
    // Tech Giants with EU presence
    'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix',
    // European Tech Companies
    'SAP', 'Siemens', 'Bosch', 'Volkswagen', 'BMW', 'Mercedes-Benz',
    'Airbus', 'ASML', 'Nokia', 'Ericsson', 'Philips', 'Unilever',
    // Fintech
    'Adyen', 'Mollie', 'Checkout.com', 'Wise', 'Plaid', 'Coinbase',
    // E-commerce
    'Zalando', 'Delivery Hero', 'Just Eat Takeaway', 'Booking.com',
    'ASOS', 'Boohoo', 'Farfetch',
    // Gaming
    'King', 'Rovio', 'Supercell', 'Ubisoft', 'CD Projekt',
    // Consulting
    'McKinsey', 'BCG', 'Bain', 'Deloitte', 'PwC', 'EY', 'KPMG',
    // Startups/Scale-ups
    'TransferWise', 'Darktrace', 'Graphcore', 'Improbable', 'Babylon',
    'Revolut', 'Monzo', 'N26', 'Klarna', 'Spotify', 'Figma'
];
// Company size categories for targeting
exports.COMPANY_SIZES = {
    startup: { min: 1, max: 50 },
    scaleup: { min: 51, max: 500 },
    mid: { min: 501, max: 2000 },
    large: { min: 2001, max: 10000 },
    enterprise: { min: 10001, max: Infinity }
};
// Industries that are particularly good for early career
exports.EARLY_CAREER_FRIENDLY_INDUSTRIES = [
    'fintech',
    'edtech',
    'healthtech',
    'cleantech',
    'gaming',
    'e-commerce',
    'saas',
    'consulting',
    'marketing',
    'design',
    'media',
    'entertainment'
];
