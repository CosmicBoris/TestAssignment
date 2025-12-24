import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  signupForm!: FormGroup;
  loading = false;
  error = '';
  success = '';

  ngOnInit() {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  async onSubmit() {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const { email, password } = this.signupForm.value;

    try {
      await this.auth.signUp(email, password);
      this.success = 'Account created! Redirecting to sign in...';
      
      setTimeout(() => {
        this.router.navigate(['/signin']);
      }, 2000);
    } catch (error: any) {
      this.error = error.message || 'Failed to sign up';
    } finally {
      this.loading = false;
    }
  }

  getErrorMessage(fieldName: string): string {
    const field = this.signupForm.get(fieldName);
    
    if (field?.hasError('required')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (field?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (field?.hasError('minlength')) {
      return `Password must be at least ${field.errors?.['minlength'].requiredLength} characters`;
    }
    
    return '';
  }

  get passwordMismatch(): boolean {
    return this.signupForm.hasError('passwordMismatch') && 
           this.signupForm.get('confirmPassword')?.touched || false;
  }
}

