import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-widget',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './auth-widget.component.html',
  styleUrls: ['./auth-widget.component.scss'],
})
export class AuthWidgetComponent implements OnInit {
  authService = inject(AuthService);
  isAuthServerAvailable = signal(false);
  isChecking = signal(true);

  async ngOnInit() {
    await this.checkAuthServer();
  }

  private async checkAuthServer(): Promise<void> {
    this.isChecking.set(true);
    const available = await this.authService.checkServerAvailability();
    this.isAuthServerAvailable.set(available);
    this.isChecking.set(false);
  }

  logout(): void {
    this.authService.logout();
  }
}
