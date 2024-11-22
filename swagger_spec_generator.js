import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Documentation',
            version: '1.0.0',
            description: 'This is the API documentation for my Node.js app',
        },
        servers: [
            {
                url: `${process.env.SWAGGER_DOCS_URL}`,
            },
        ],
    },
    apis: [
        '../routes/super_admin/*.js',
        '../controllers/*.js',
        '../models/*.js',
        '../middleware/*.js',
        '../docs/*.yaml',
    ],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export default swaggerSpec;