from django.urls import path
from . import views

urlpatterns = [
    # Frontend SPA view
    path('', views.index_view, name='index'),

    # Workplace & Role API
    path('api/workplaces/', views.WorkplaceListAPIView.as_view(), name='workplace-list'),
    path('api/workplaces/<str:identifier>/', views.WorkplaceDetailAPIView.as_view(), name='workplace-detail'),

    # Session Lifecycle API
    path('api/sessions/', views.SessionCreateAPIView.as_view(), name='session-create'),
    path('api/sessions/<uuid:session_id>/', views.SessionDetailAPIView.as_view(), name='session-detail'),
    path('api/sessions/<uuid:session_id>/answers/', views.SessionAnswerAPIView.as_view(), name='session-answer'),

    # Stage Progression API
    path('api/sessions/<uuid:session_id>/stage/<int:stage_number>/', views.StageScenariosAPIView.as_view(), name='stage-scenarios'),
    path('api/sessions/<uuid:session_id>/stage/<int:stage_number>/submit/', views.StageSubmitAPIView.as_view(), name='stage-submit'),

    # Results & Reflection API
    path('api/sessions/<uuid:session_id>/results/', views.ResultsAPIView.as_view(), name='session-results'),
    path('api/sessions/<uuid:session_id>/reflection/', views.ReflectionAPIView.as_view(), name='session-reflection'),
    path('api/sessions/<uuid:session_id>/complete/', views.SessionCompleteAPIView.as_view(), name='session-complete'),

    # Student Authentication & Profile API
    path('api/auth/register/', views.RegisterAPIView.as_view(), name='auth-register'),
    path('api/auth/login/', views.LoginAPIView.as_view(), name='auth-login'),
    path('api/auth/logout/', views.LogoutAPIView.as_view(), name='auth-logout'),
    path('api/auth/me/', views.CurrentUserAPIView.as_view(), name='auth-me'),
    path('api/auth/history/', views.UserHistoryAPIView.as_view(), name='auth-history'),

    # Student Dashboard & Career Portfolio Analytics
    path('api/student/dashboard/', views.StudentDashboardAPIView.as_view(), name='student-dashboard'),
    path('api/sessions/<uuid:session_id>/review/', views.SessionReviewAPIView.as_view(), name='session-review'),
    path('api/sessions/<uuid:session_id>/certificate/', views.SessionCertificateAPIView.as_view(), name='session-certificate'),
]

