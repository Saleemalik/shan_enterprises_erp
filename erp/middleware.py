# erp/middleware.py
class LicenseMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # allow these without license
        allowed_paths = [
            "/api/auth/",
            "/api/login/",
            "/api/token/",
            "/api/activate-license/",
        ]

        if any(request.path.startswith(p) for p in allowed_paths):
            return self.get_response(request)

        if request.path.startswith("/api/"):
            from erp.models import License
            if not License.objects.filter(is_active=True).exists():
                from django.http import JsonResponse
                return JsonResponse(
                    {"error": "Software not activated"},
                    status=403
                )

        return self.get_response(request)
