import json
import logging
from dataclasses import dataclass, asdict
from functools import wraps
from typing import Any

from django.contrib.auth import PermissionDenied
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models.signals import post_save, post_delete
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from rcon.audit import heartbeat, online_mods, set_registered_mods, ingame_mods
from rcon.cache_utils import ttl_cache
from .models import SteamPlayer
import csv

logger = logging.getLogger('rconweb')


def update_mods(sender, instance, **kwargs):
    set_registered_mods(get_moderators_accounts())


post_save.connect(update_mods, sender=User)
post_delete.connect(update_mods, sender=User)
post_save.connect(update_mods, sender=SteamPlayer)
post_delete.connect(update_mods, sender=SteamPlayer)


@dataclass
class RconResponse:
    result: Any = None
    command: str = None
    arguments: dict = None
    failed: bool = True
    error: str = None
    forwards_results: Any = None

    def to_dict(self):
        return asdict(self)


def api_response(*args, **kwargs):
    status_code = kwargs.pop("status_code", 200)
    return JsonResponse(
        RconResponse(*args, **kwargs).to_dict(),
        status=status_code
    )


def api_csv_response(content, name, header):
    response = HttpResponse(
        content_type='text/csv',
    )
    response['Content-Disposition'] = 'attachment; filename="%s"' % name

    writer = csv.DictWriter(response, fieldnames=header, dialect='excel')
    writer.writerows(content)

    return response


@csrf_exempt
def do_login(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        logger.debug("Login attempt without data")
        raise PermissionDenied("No data")

    name = data.get('username')
    password = data.get('password')
    try:
        user = authenticate(request, username=name, password=password)
        if user is not None:
            login(request, user)
            logger.info("Successful login: %s", name)
            return api_response(
                result=True,
                command="login",
                arguments=name,
                failed=False
            )
        else:
            logger.warning("Failed login attempt %s", data)
            raise PermissionDenied("Invalid login")
    except PermissionDenied:
        logger.warning("Failed login attempt %s", data)
        return api_response(
            command="login",
            arguments=name,
            status_code=401
        )


@ttl_cache(60 * 60, cache_falsy=False)
def get_moderators_accounts():
    return [(u.user.username, u.steam_id_64) for u in SteamPlayer.objects.all()]


@csrf_exempt
def is_logged_in(request):
    res = request.user.is_authenticated
    if res:
        try:
            steam_id = None
            try:
                steam_id = request.user.steamplayer.steam_id_64
            except:
                logger.warning("%s's steam id is not set ", request.user.username)
            try:
                heartbeat(request.user.username, steam_id)
            except:
                logger.exception("Unable to register mods")
        except:
            logger.exception("Can't record heartbeat")

    return api_response(
        result=res,
        command="is_logged_in",
        failed=False
    )


@csrf_exempt
def do_logout(request):
    logout(request)
    return api_response(
        result=True,
        command="logout",
        failed=False
    )


def login_required(func):
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return api_response(
                command=request.path,
                error="You must be logged in to use this",
                failed=True,
                status_code=401
            )
        try:
            return func(request, *args, **kwargs)
        except Exception as e:
            logger.exception("Unexpected error in %s", func.__name__)
            return api_response(
                command=request.path,
                error=repr(e),
                failed=True,
                status_code=500
            )

    return wrapper


# Login required?
@csrf_exempt
def get_online_mods(request):
    return api_response(
        command="get_online_mods",
        result=online_mods(),
        failed=False,
    )


@csrf_exempt
def get_ingame_mods(request):
    return api_response(
        command="get_ingame_mods",
        result=ingame_mods(),
        failed=False,
    )
