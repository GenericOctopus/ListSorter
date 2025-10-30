import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  password = '';
  passwordConfirm = '';
  loading = false;
  error = '';
  success = false;
  userId = '';
  secret = '';
  invalidLink = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Get userId and secret from query parameters
    this.route.queryParams.subscribe(params => {
      this.userId = params['userId'] || '';
      this.secret = params['secret'] || '';
      
      if (!this.userId || !this.secret) {
        this.invalidLink = true;
        this.error = 'Invalid or expired reset link';
      }
    });
  }

  async onSubmit() {
    if (!this.password || !this.passwordConfirm) {
      this.error = 'Please fill in all fields';
      return;
    }

    if (this.password.length < 8) {
      this.error = 'Password must be at least 8 characters long';
      return;
    }

    if (this.password !== this.passwordConfirm) {
      this.error = 'Passwords do not match';
      return;
    }

    this.loading = true;
    this.error = '';

    const result = await this.authService.completePasswordReset(
      this.userId,
      this.secret,
      this.password,
      this.passwordConfirm
    );

    this.loading = false;

    if (result.success) {
      this.success = true;
      // Redirect to login after 3 seconds
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    } else {
      this.error = result.error || 'Failed to reset password';
    }
  }
}
