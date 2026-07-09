import { Module } from '@nestjs/common';
import { HealthController, MatchesController, ContributionsController, StatisticsController } from './controllers';
import { ConsensusService } from './consensus.service';
import { StatisticsService } from './statistics.service';
import { IdentityService } from './identity.service';
import { AdministrationController, AdminKeyGuard, CatalogController } from './administration.controller';
import { AdministrationService } from './administration.service';
import { PrismaService } from './prisma.service';
import { EventValidationService } from './event-validation.service';
import { TransferContributionController } from './transfer-contribution.controller';
import { TransferContributionService } from './transfer-contribution.service';
import { AuthController, RoleGuard } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { AssetService } from './asset.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PublicDataController } from './public-data.controller';
import { PublicDataService } from './public-data.service';

@Module({ imports:[ThrottlerModule.forRoot([{ttl:60000,limit:120}])],controllers: [HealthController, AuthController, PublicDataController, MatchesController, ContributionsController, StatisticsController, TransferContributionController, AdministrationController, CatalogController], providers: [AuthService, EmailService, AssetService, PublicDataService, RoleGuard, ConsensusService, StatisticsService, IdentityService, EventValidationService, TransferContributionService, AdministrationService, PrismaService, AdminKeyGuard,{provide:APP_GUARD,useClass:ThrottlerGuard}] })
export class AppModule {}
