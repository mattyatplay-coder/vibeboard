import { Request, Response, NextFunction } from 'express';

export const mockAuth = (req: Request, res: Response, next: NextFunction) => {
    // Mock user for development
    // In production, this would be replaced by real JWT verification
    (req as any).user = {
        id: 'user_default',
        email: 'dev@vibeboard.ai',
        name: 'Developer'
    };
    next();
};
