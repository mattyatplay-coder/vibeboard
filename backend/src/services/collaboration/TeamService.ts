/**
 * TeamService - Phase 7: Team Collaboration
 *
 * Simplified multi-tenant team management for SaaS.
 * Team is the core tenant unit - Projects, Elements, LoRAs belong to Teams.
 */

import { prisma } from '../../prisma';
import { loggers } from '../../utils/logger';

const log = loggers.api.child({ service: 'TeamService' });

// Role permissions (simplified)
const ROLE_CAN_EDIT = ['owner', 'admin', 'member'];
const ROLE_CAN_ADMIN = ['owner', 'admin'];
const ROLE_CAN_DELETE = ['owner'];

export interface CreateTeamInput {
    name: string;
    slug?: string;
}

export interface InviteMemberInput {
    userId: string;
    role?: 'owner' | 'admin' | 'member' | 'viewer';
}

class TeamService {
    private static instance: TeamService;

    private constructor() {}

    static getInstance(): TeamService {
        if (!TeamService.instance) {
            TeamService.instance = new TeamService();
        }
        return TeamService.instance;
    }

    // =========================================================================
    // TEAM MANAGEMENT
    // =========================================================================

    /**
     * Create a new team - the creator becomes the owner
     */
    async createTeam(userId: string, input: CreateTeamInput) {
        const slug = input.slug || this.generateSlug(input.name);

        // Check if slug is taken
        const existing = await prisma.team.findUnique({ where: { slug } });
        if (existing) {
            throw new Error(`Team slug "${slug}" is already taken`);
        }

        const team = await prisma.team.create({
            data: {
                name: input.name,
                slug,
                ownerId: userId,
                members: {
                    create: {
                        userId,
                        role: 'owner',
                    },
                },
            },
            include: { members: true },
        });

        log.info({ teamId: team.id, userId }, 'Team created');
        return team;
    }

    /**
     * Get team by ID with members
     */
    async getTeam(teamId: string) {
        return prisma.team.findUnique({
            where: { id: teamId },
            include: {
                members: true,
                projects: {
                    select: { id: true, name: true, updatedAt: true },
                    orderBy: { updatedAt: 'desc' },
                },
                _count: {
                    select: {
                        projects: true,
                        elements: true,
                        loras: true,
                    },
                },
            },
        });
    }

    /**
     * Get team by slug
     */
    async getTeamBySlug(slug: string) {
        return prisma.team.findUnique({
            where: { slug },
            include: {
                members: true,
                _count: {
                    select: {
                        projects: true,
                        elements: true,
                        loras: true,
                    },
                },
            },
        });
    }

    /**
     * Get all teams a user is a member of
     */
    async getUserTeams(userId: string) {
        const memberships = await prisma.teamMember.findMany({
            where: { userId },
            include: {
                team: {
                    include: {
                        _count: {
                            select: {
                                members: true,
                                projects: true,
                            },
                        },
                    },
                },
            },
        });

        return memberships.map((m) => ({
            ...m.team,
            role: m.role,
        }));
    }

    /**
     * Update team settings (owner/admin only)
     */
    async updateTeam(teamId: string, userId: string, updates: Partial<CreateTeamInput>) {
        await this.requireRole(teamId, userId, ROLE_CAN_ADMIN);

        const team = await prisma.team.update({
            where: { id: teamId },
            data: {
                name: updates.name,
                // Slug cannot be changed after creation
            },
        });

        log.info({ teamId, userId }, 'Team updated');
        return team;
    }

    /**
     * Delete team (owner only)
     */
    async deleteTeam(teamId: string, userId: string) {
        await this.requireRole(teamId, userId, ROLE_CAN_DELETE);

        await prisma.team.delete({ where: { id: teamId } });
        log.info({ teamId, userId }, 'Team deleted');
    }

    // =========================================================================
    // MEMBER MANAGEMENT
    // =========================================================================

    /**
     * Add a member to the team (admin+ only)
     */
    async addMember(teamId: string, adminId: string, input: InviteMemberInput) {
        await this.requireRole(teamId, adminId, ROLE_CAN_ADMIN);

        // Check team capacity
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: { _count: { select: { members: true } } },
        });

        if (!team) throw new Error('Team not found');
        if (team._count.members >= team.maxMembers) {
            throw new Error(`Team has reached maximum capacity (${team.maxMembers} members)`);
        }

        // Check if already a member
        const existing = await prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: input.userId } },
        });
        if (existing) {
            throw new Error('User is already a team member');
        }

        const member = await prisma.teamMember.create({
            data: {
                teamId,
                userId: input.userId,
                role: input.role || 'member',
            },
        });

        log.info({ teamId, userId: input.userId, adminId }, 'Team member added');
        return member;
    }

    /**
     * Update member role (admin+ only, can't change owner)
     */
    async updateMemberRole(teamId: string, adminId: string, memberId: string, newRole: string) {
        await this.requireRole(teamId, adminId, ROLE_CAN_ADMIN);

        // Get target member
        const target = await prisma.teamMember.findFirst({
            where: { teamId, userId: memberId },
        });

        if (!target) throw new Error('Member not found');
        if (target.role === 'owner') {
            throw new Error("Cannot change the owner's role");
        }

        const updated = await prisma.teamMember.update({
            where: { id: target.id },
            data: { role: newRole },
        });

        log.info({ teamId, memberId, newRole, adminId }, 'Member role updated');
        return updated;
    }

    /**
     * Remove member from team (admin+ only, can't remove owner)
     */
    async removeMember(teamId: string, adminId: string, memberId: string) {
        await this.requireRole(teamId, adminId, ROLE_CAN_ADMIN);

        const target = await prisma.teamMember.findFirst({
            where: { teamId, userId: memberId },
        });

        if (!target) throw new Error('Member not found');
        if (target.role === 'owner') {
            throw new Error('Cannot remove the team owner');
        }

        await prisma.teamMember.delete({ where: { id: target.id } });
        log.info({ teamId, memberId, adminId }, 'Member removed from team');
    }

    /**
     * Leave a team (member removes themselves)
     */
    async leaveTeam(teamId: string, userId: string) {
        const membership = await prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId } },
        });

        if (!membership) throw new Error('You are not a member of this team');
        if (membership.role === 'owner') {
            throw new Error('Team owner cannot leave. Transfer ownership or delete the team.');
        }

        await prisma.teamMember.delete({ where: { id: membership.id } });
        log.info({ teamId, userId }, 'User left team');
    }

    // =========================================================================
    // QUOTA MANAGEMENT (Shared GPU quota)
    // =========================================================================

    /**
     * Check if team has remaining generation quota
     */
    async checkTeamQuota(teamId: string): Promise<boolean> {
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            select: { monthlyGenerations: true, monthlyGenerationsLimit: true },
        });

        if (!team) return false;
        return team.monthlyGenerations < team.monthlyGenerationsLimit;
    }

    /**
     * Increment team's monthly generation count
     */
    async incrementTeamGenerations(teamId: string, count: number = 1) {
        return prisma.team.update({
            where: { id: teamId },
            data: {
                monthlyGenerations: { increment: count },
            },
        });
    }

    /**
     * Reset monthly quotas (for billing cycle)
     */
    async resetMonthlyQuotas(teamId: string) {
        return prisma.team.update({
            where: { id: teamId },
            data: { monthlyGenerations: 0 },
        });
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);
    }

    /**
     * Require user to have one of the specified roles
     */
    private async requireRole(teamId: string, userId: string, allowedRoles: string[]) {
        const membership = await prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId } },
        });

        if (!membership) {
            throw new Error('Not a member of this team');
        }

        if (!allowedRoles.includes(membership.role)) {
            throw new Error(`Insufficient permissions. Required: ${allowedRoles.join(' or ')}`);
        }
    }

    /**
     * Check if user can view team resources
     */
    async canViewTeam(teamId: string, userId: string): Promise<boolean> {
        const membership = await prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId } },
        });
        return !!membership;
    }

    /**
     * Check if user can edit team resources
     */
    async canEditTeam(teamId: string, userId: string): Promise<boolean> {
        const membership = await prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId } },
        });
        return !!membership && ROLE_CAN_EDIT.includes(membership.role);
    }
}

export const teamService = TeamService.getInstance();
